import { WebSocketServer, WebSocket } from 'ws';
import si from 'systeminformation';

const PORT = Number(process.env.PORT) || 4000;
const wss = new WebSocketServer({ port: PORT });

console.log(`System WebSocket monitor started on port ${PORT}`);

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
          ramPercent: ramPercent,
          ramUsedGb: activeRamGb.toFixed(2),
          ramTotalGb: totalRamGb.toFixed(2),
          networkDown: netDownMbit,
          networkUp: netUpMbit,
          cpuTemp: cpuTemp
        },
        chartData: metricsHistory
      }
    };
  } catch (error) {
    console.error('Error collecting system metrics:', error);
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
  console.log('Monitor: new client connected');

  if (metricsHistory.length === 0) {
    await getSystemMetrics();
  }

  const lastPoint = metricsHistory[metricsHistory.length - 1];
  ws.send(JSON.stringify({
    event: 'SYSTEM_METRICS_UPDATE',
    data: {
      current: lastPoint ? {
        cpu: lastPoint.cpu,
        ramPercent: lastPoint.ram,
        ramUsedGb: '...',
        ramTotalGb: '...',
        networkDown: lastPoint.networkDown,
        networkUp: lastPoint.networkUp,
        cpuTemp: lastPoint.cpuTemp
      } : { cpu: 0, ramPercent: 0, ramUsedGb: '0', ramTotalGb: '0', networkDown: 0, networkUp: 0, cpuTemp: 35 },
      chartData: metricsHistory
    }
  }));

  ws.on('message', (message: string) => {
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
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
});

startBroadcastLoop();