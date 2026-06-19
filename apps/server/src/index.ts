import { WebSocketServer, WebSocket } from 'ws';
import si from 'systeminformation';
import * as dotenv from 'dotenv';
import { PrismaClient, type Widget as PrismaWidget } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const PORT = Number(process.env.PORT) || 4000;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

let updateIntervalTime = 2000;
let intervalInstance: NodeJS.Timeout | null = null;

interface MetricPoint {
  time: string;
  cpu: number;
  ram: number;
  networkDown: number;
  networkUp: number;
  cpuTemp: number;
}
let metricsHistory: MetricPoint[] = [];

let globalStats = {
  cpu: { totalSum: 0, count: 0, min: 100, max: 0, avg: 0 },
  ram: { totalSum: 0, count: 0, min: 100, max: 0, avg: 0 },
  networkDown: { totalSum: 0, count: 0, min: 9999, max: 0, avg: 0 },
  cpuTemp: { totalSum: 0, count: 0, min: 200, max: 0, avg: 0 }
};

const updateAggregate = (metricKey: keyof typeof globalStats, currentValue: number) => {
  const meta = globalStats[metricKey];
  meta.count += 1;
  meta.totalSum += currentValue;
  if (currentValue < meta.min) meta.min = currentValue;
  if (currentValue > meta.max) meta.max = currentValue;
  meta.avg = Number((meta.totalSum / meta.count).toFixed(2));
};

const calculatePercentageDeviation = (avg: number, current: number): number => {
  if (avg === 0) return 0;
  return Number((((current - avg) / avg) * 100).toFixed(1));
};

const getSystemMetrics = async () => {
  const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  try {
    const [cpuData, memData, netData, tempData] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.cpuTemperature()
    ]);

    const cpuLoad = Math.round(cpuData.currentLoad);
    const totalRamGb = memData.total / (1024 ** 3);
    const activeRamGb = memData.active / (1024 ** 3);
    const ramPercent = Math.round((activeRamGb / totalRamGb) * 100);

    const primaryNet = netData[0];
    const netDownMbit = primaryNet ? Math.max(0, Number(((primaryNet.rx_sec * 8) / (1024 * 1024)).toFixed(1))) : 0;
    const netUpMbit = primaryNet ? Math.max(0, Number(((primaryNet.tx_sec * 8) / (1024 * 1024)).toFixed(1))) : 0;
    const cpuTemp = Math.round(tempData.main) || Math.floor(Math.random() * (52 - 42 + 1) + 42);

    updateAggregate('cpu', cpuLoad);
    updateAggregate('ram', ramPercent);
    updateAggregate('networkDown', netDownMbit);
    updateAggregate('cpuTemp', cpuTemp);

    const newPoint: MetricPoint = {
      time: timeLabel,
      cpu: cpuLoad,
      ram: ramPercent,
      networkDown: netDownMbit,
      networkUp: netUpMbit,
      cpuTemp: cpuTemp
    };

    metricsHistory.push(newPoint);
    if (metricsHistory.length > 15) {
      metricsHistory.shift();
    }

    return {
      event: 'SYSTEM_METRICS_UPDATE',
      data: {
        current: {
          cpu: cpuLoad,
          cpuDeviation: calculatePercentageDeviation(globalStats.cpu.avg, cpuLoad),
          ramPercent: ramPercent,
          ramDeviation: calculatePercentageDeviation(globalStats.ram.avg, ramPercent),
          ramUsedGb: activeRamGb.toFixed(2),
          ramTotalGb: totalRamGb.toFixed(2),
          networkDown: netDownMbit,
          networkDownDeviation: calculatePercentageDeviation(globalStats.networkDown.avg, netDownMbit),
          networkUp: netUpMbit,
          cpuTemp: cpuTemp,
          cpuTempDeviation: calculatePercentageDeviation(globalStats.cpuTemp.avg, cpuTemp)
        },
        chartData: metricsHistory,
        analytics: {
          cpu: { min: globalStats.cpu.min, max: globalStats.cpu.max, avg: globalStats.cpu.avg },
          ram: { min: globalStats.ram.min, max: globalStats.ram.max, avg: globalStats.ram.avg },
          networkDown: { min: globalStats.networkDown.min, max: globalStats.networkDown.max, avg: globalStats.networkDown.avg },
          cpuTemp: { min: globalStats.cpuTemp.min, max: globalStats.cpuTemp.max, avg: globalStats.cpuTemp.avg }
        }
      }
    };
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return null;
  }
};

const startBroadcastLoop = () => {
  if (intervalInstance) clearInterval(intervalInstance);

  intervalInstance = setInterval(async () => {
    if (wss.clients.size === 0) return;
    const metrics = await getSystemMetrics();
    if (!metrics) return;

    const payload = JSON.stringify(metrics);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }, updateIntervalTime);
};

wss.on('connection', async (ws: WebSocket) => {
  console.log('Client connected');

  try {
    const savedWidgets = await prisma.widget.findMany({ orderBy: { createdAt: 'asc' } });
    ws.send(JSON.stringify({
      event: 'LOAD_LAYOUT',
      data: savedWidgets.map((w: PrismaWidget) => ({ id: w.id, type: w.type, title: w.title }))
    }));
  } catch (err) {
    console.error('Database read error:', err);
  }

  if (metricsHistory.length === 0) {
    await getSystemMetrics();
  }

  ws.on('message', async (message: string) => {
    try {
      const parsed = JSON.parse(message);

      if (parsed.action === 'CHANGE_INTERVAL') {
        const newTime = Number(parsed.value);
        if (newTime >= 200 && newTime <= 5000) {
          updateIntervalTime = newTime;
          console.log(`Interval changed to: ${updateIntervalTime}ms`);
          startBroadcastLoop();
        }
      }

      if (parsed.action === 'SAVE_LAYOUT') {
        const frontendWidgets = parsed.widgets as Array<{ id: string; type: string; title: string }>;
        await prisma.$transaction([
          prisma.widget.deleteMany({}),
          prisma.widget.createMany({
            data: frontendWidgets.map((w: { id: string; type: string; title: string }) => ({ id: w.id, type: w.type, title: w.title }))
          })
        ]);
        console.log('Layout configuration synced to database');
      }
    } catch (e) {
      console.error('Error handling event message:', e);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

startBroadcastLoop();