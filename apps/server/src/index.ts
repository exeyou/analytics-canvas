import { WebSocketServer, WebSocket } from 'ws';
import si from 'systeminformation';

const PORT = Number(process.env.PORT) || 4000;
const wss = new WebSocketServer({ port: PORT });

console.log(`System WebSocket monitor started on port ${PORT}`);

let updateIntervalTime = 2000;
let intervalInstance: NodeJS.Timeout | null = null;

let metricsHistory: Array<{ time: string; cpu: number; ram: number }> = [];

const getSystemMetrics = async () => {
  const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  try {
    const [cpuData, memData] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);

    const cpuLoad = Math.round(cpuData.currentLoad);

    const totalRamGb = memData.total / (1024 ** 3);
    const activeRamGb = memData.active / (1024 ** 3);
    const ramPercent = Math.round((activeRamGb / totalRamGb) * 100);

    const newPoint = {
      time: timeLabel,
      cpu: cpuLoad,
      ram: ramPercent,
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
          ramTotalGb: totalRamGb.toFixed(2)
        },
        chartData: metricsHistory
      }
    };
  } catch (error) {
    console.error('Error gathering system metrics:', error);
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
  console.log('🔌 Monitor: new client/tab connected');

  if (metricsHistory.length === 0) {
    await getSystemMetrics();
  }

  const lastItem = metricsHistory[metricsHistory.length - 1];

  ws.send(JSON.stringify({
    event: 'SYSTEM_METRICS_UPDATE',
    data: {
      current: lastItem ? {
        cpu: lastItem.cpu,
        ramPercent: lastItem.ram,
        ramUsedGb: '...',
        ramTotalGb: '...'
      } : { cpu: 0, ramPercent: 0, ramUsedGb: '0', ramTotalGb: '0' },
      chartData: metricsHistory
    }
  }));

  ws.on('message', (message: string) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.action === 'CHANGE_INTERVAL') {
        const newTime = Number(parsed.value);
        if (newTime >= 100 && newTime <= 10000) {
          updateIntervalTime = newTime;
          console.log(`⏱️ Update interval changed by client to: ${updateIntervalTime}ms`);
          startBroadcastLoop();
        }
      }
    } catch (e) {
      console.error('Error processing custom event:', e);
    }
  });

  ws.on('close', () => console.log('Monitor: client disconnected'));
});

startBroadcastLoop();