'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MetricCard } from '../widgets/MetricCard';
import { BarChartWidget } from '../widgets/BarChartWidget';

interface SystemMetrics {
  current: {
    cpu: number;
    ramPercent: number;
    ramUsedGb: string;
    ramTotalGb: string;
    networkDown: number;
    networkUp: number;
    cpuTemp: number;
  };
  chartData: Array<{
    time: string;
    cpu: number;
    ram: number;
    networkDown: number;
    networkUp: number;
    cpuTemp: number;
  }>;
}

export function Canvas() {
  const { widgets, removeWidget } = useDashboardStore();
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas-dropzone' });

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:4000');
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus('online');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'SYSTEM_METRICS_UPDATE') {
          setMetrics(payload.data);
        }
      } catch (error) {
        console.error('Error parsing system data:', error);
      }
    };

    socket.onclose = () => {
      setStatus('offline');
    };

    const handleIntervalChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          action: 'CHANGE_INTERVAL',
          value: customEvent.detail
        }));
      }
    };

    window.addEventListener('change_ws_interval', handleIntervalChange);

    return () => {
      window.removeEventListener('change_ws_interval', handleIntervalChange);
      socket.close();
    };
  }, []);

  const getChartDataForType = (type: 'ram' | 'network') => {
    if (!metrics) return [];
    return metrics.chartData.map(point => ({
      time: point.time,
      uv: type === 'ram' ? point.ram : point.networkDown,
      pv: type === 'network' ? point.networkUp : 0
    }));
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 p-6 h-screen overflow-y-auto transition-colors ${
        isOver ? 'bg-primary/5 border-2 border-dashed border-primary' : 'bg-background'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Server Monitoring Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-1">Real-time metrics of the current OS node</p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className={`h-2 w-2 rounded-full ${
            status === 'online' ? 'bg-emerald-500 animate-pulse' : status === 'connecting' ? 'bg-amber-500' : 'bg-destructive'
          }`} />
          <span className="text-muted-foreground uppercase tracking-wider">{status}</span>
        </div>
      </div>

      {widgets.length === 0 ? (
        <div className="flex items-center justify-center h-[70%] border border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">Drag widgets here from the left panel</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map((widget) => {
            const uType = widget.type.toUpperCase();
            return (
              <div key={widget.id} className="bg-card border rounded-xl p-4 shadow-sm relative group">
                <button
                  onClick={() => removeWidget(widget.id)}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>

                <div className="text-xs text-muted-foreground mb-2 font-mono uppercase tracking-wider">
                  {widget.type}
                </div>
                <h4 className="font-semibold mb-4 text-card-foreground">{widget.title}</h4>

                <div className="min-h-[140px]">
                  {uType === 'METRIC_CARD' ? (
                    <MetricCard
                      title="CPU Load"
                      value={metrics ? `${metrics.current.cpu}%` : 'Collecting...'}
                      description="total across all cores"
                    />
                  ) : uType === 'TEMP_CARD' ? (
                    <MetricCard
                      title="CPU Core Temperature"
                      value={metrics ? `${metrics.current.cpuTemp} °C` : 'Collecting...'}
                      description={metrics && metrics.current.cpuTemp > 75 ? 'Elevated heating' : 'Normal state'}
                    />
                  ) : uType === 'BAR_CHART' ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 px-1 flex justify-between">
                        <span>Memory Usage (RAM %)</span>
                        {metrics?.current.ramUsedGb && (
                          <span className="font-mono">
                            {metrics.current.ramUsedGb} GB / {metrics.current.ramTotalGb} GB
                          </span>
                        )}
                      </div>
                      {metrics ? (
                        <BarChartWidget data={getChartDataForType('ram')} />
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center justify-center h-32">
                          Waiting for OS tick...
                        </div>
                      )}
                    </div>
                  ) : uType === 'NETWORK_CHART' ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 px-1 flex justify-between">
                        <span>Network Speed (Download)</span>
                        {metrics?.current && (
                          <span className="font-mono text-emerald-500">
                            Down: {metrics.current.networkDown} Mbps Up: {metrics.current.networkUp} Mbps
                          </span>
                        )}
                      </div>
                      {metrics ? (
                        <BarChartWidget data={getChartDataForType('network')} />
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center justify-center h-32">
                          Analyzing network packets...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Unknown type</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}