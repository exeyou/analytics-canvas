'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDashboardStore } from '../../store/useDashboardStore';
import { MetricCard } from '../widgets/MetricCard';
import { BarChartWidget } from '../widgets/BarChartWidget';
import { ArrowUpRight, ArrowDownRight, Power, PowerOff } from 'lucide-react';

interface AnalyticsMeta { min: number; max: number; avg: number; }
interface SystemMetrics {
  current: {
    cpu: number; cpuDeviation: number; ramPercent: number; ramDeviation: number;
    ramUsedGb: string; ramTotalGb: string; networkDown: number; networkDownDeviation: number;
    networkUp: number; cpuTemp: number; cpuTempDeviation: number;
  };
  chartData: Array<{ time: string; cpu: number; ram: number; networkDown: number; networkUp: number; cpuTemp: number; }>;
  analytics: { cpu: AnalyticsMeta; ram: AnalyticsMeta; networkDown: AnalyticsMeta; cpuTemp: AnalyticsMeta; };
}

export function Canvas() {
  const { widgets, listeners, setSocket } = useDashboardStore();
  const { isOver, setNodeRef } = useDroppable({ id: 'canvas-dropzone' });
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:4000');
    setSocket(socket);

    socket.onopen = () => setStatus('online');
    socket.onclose = () => setStatus('offline');

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'LOAD_LAYOUT') {
          useDashboardStore.getState().setWidgets(payload.data.widgets);
          useDashboardStore.getState().setListeners(payload.data.listeners);
          useDashboardStore.getState().setInitialized(true);
        }
        if (payload.event === 'SYSTEM_METRICS_UPDATE') {
          setMetrics(payload.data);
        }
      } catch (error) {
        console.error('Error processing socket message:', error);
      }
    };

    const handleIntervalChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ action: 'CHANGE_INTERVAL', value: customEvent.detail }));
      }
    };

    window.addEventListener('change_ws_interval', handleIntervalChange);

    return () => {
      window.removeEventListener('change_ws_interval', handleIntervalChange);
      useDashboardStore.getState().setInitialized(false);
      socket.close();
      setSocket(null);
    };
  }, [setSocket]);

  const getChartDataForType = (type: 'ram' | 'network') => {
    if (!metrics) return [];
    return metrics.chartData.map(point => ({
      time: point.time,
      uv: type === 'ram' ? point.ram : point.networkDown,
      pv: type === 'network' ? point.networkUp : 0
    }));
  };

  const getInlineBadgeStyles = (deviation: number, type: 'ram' | 'network') => {
    if (deviation === 0) return 'text-muted-foreground';
    if (type === 'network') return 'text-emerald-500';
    return deviation > 0 ? 'text-[#ef4444] font-semibold' : 'text-emerald-500';
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
          <h2 className="text-xl font-bold text-foreground">Server Infrastructure Workspace</h2>
          <p className="text-xs text-muted-foreground mt-1">Real-time system environment tracking</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className={`h-2 w-2 rounded-full ${status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
          <span className="text-muted-foreground uppercase tracking-wider">{status}</span>
        </div>
      </div>

      {metrics && (
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">CPU Bounds</span>
            <span className="text-xs text-foreground mt-1">Min: {metrics.analytics.cpu.min}% | Max: {metrics.analytics.cpu.max}%</span>
            <span className="text-[10px] text-primary font-medium">Avg: {metrics.analytics.cpu.avg}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">RAM Bounds</span>
            <span className="text-xs text-foreground mt-1">Min: {metrics.analytics.ram.min}% | Max: {metrics.analytics.ram.max}%</span>
            <span className="text-[10px] text-primary font-medium">Avg: {metrics.analytics.ram.avg}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">Network Rate</span>
            <span className="text-xs text-foreground mt-1">Min: {metrics.analytics.networkDown.min}M | Max: {metrics.analytics.networkDown.max}M</span>
            <span className="text-[10px] text-primary font-medium">Avg: {metrics.analytics.networkDown.avg} Mbps</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">Thermal Core</span>
            <span className="text-xs text-foreground mt-1">Min: {metrics.analytics.cpuTemp.min}°C | Max: {metrics.analytics.cpuTemp.max}°C</span>
            <span className="text-[10px] text-primary font-medium">Avg: {metrics.analytics.cpuTemp.avg}°C</span>
          </div>
        </div>
      )}

      {widgets.length === 0 ? (
        <div className="flex items-center justify-center h-[60%] border border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">Drag and drop resource widgets here to initialize workspace telemetry</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {widgets.map((widget) => {
            const uType = widget.type.toUpperCase();
            const isListening = listeners[widget.type] ?? true;

            return (
              <div
                key={widget.id}
                className={`bg-card border rounded-xl p-5 shadow-sm relative group flex flex-col transition-all duration-200 ${
                  !isListening ? 'border-dashed border-muted bg-muted/10 opacity-70' : 'border-border'
                }`}
              >
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => useDashboardStore.getState().toggleListener(widget.type)}
                    className={`p-1 rounded-md transition-colors ${isListening ? 'text-emerald-500 hover:bg-emerald-50' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    {isListening ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => useDashboardStore.getState().removeWidget(widget.id)} className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    Remove
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-bold text-sm tracking-tight text-card-foreground">{widget.title}</h4>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${isListening ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}>
                    {isListening ? 'LIVE' : 'MUTED'}
                  </span>
                </div>

                <div className="w-full">
                  {!isListening ? (
                    <div className="text-xs text-muted-foreground font-mono h-32 flex items-center justify-center border border-dashed rounded-lg bg-muted/20">
                      Telemetry tracking backgrounded
                    </div>
                  ) : uType === 'METRIC_CARD' ? (
                    <MetricCard title="System CPU Compute Utilization" value={metrics ? `${metrics.current.cpu}%` : 'Loading...'} deviation={metrics ? metrics.current.cpuDeviation : 0} metricType="cpu" />
                  ) : uType === 'TEMP_CARD' ? (
                    <MetricCard title="Processor Core Temperature" value={metrics ? `${metrics.current.cpuTemp} °C` : 'Loading...'} deviation={metrics ? metrics.current.cpuTempDeviation : 0} metricType="temp" />
                  ) : uType === 'BAR_CHART' ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 px-1 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span>Memory Delta:</span>
                          {metrics && (
                            <span className={`flex items-center text-xs font-semibold ${getInlineBadgeStyles(metrics.current.ramDeviation, 'ram')}`}>
                              {metrics.current.ramDeviation > 0 ? '+' : ''}{metrics.current.ramDeviation}%
                              {metrics.current.ramDeviation !== 0 && (metrics.current.ramDeviation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                            </span>
                          )}
                        </div>
                        {metrics?.current.ramUsedGb && <span className="font-mono text-[11px]">{metrics.current.ramUsedGb} GB / {metrics.current.ramTotalGb} GB</span>}
                      </div>
                      {metrics ? <BarChartWidget data={getChartDataForType('ram')} /> : <div className="text-xs text-muted-foreground flex items-center justify-center h-32">Gathering snapshot...</div>}
                    </div>
                  ) : uType === 'NETWORK_CHART' ? (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 px-1 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span>Bandwidth Delta:</span>
                          {metrics && (
                            <span className={`flex items-center text-xs font-semibold ${getInlineBadgeStyles(metrics.current.networkDownDeviation, 'network')}`}>
                              {metrics.current.networkDownDeviation > 0 ? '+' : ''}{metrics.current.networkDownDeviation}%
                              {metrics.current.networkDownDeviation !== 0 && (metrics.current.networkDownDeviation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                            </span>
                          )}
                        </div>
                        {metrics?.current && <span className="font-mono text-emerald-500 text-[11px]">▼ {metrics.current.networkDown} Mbps  ▲ {metrics.current.networkUp} Mbps</span>}
                      </div>
                      {metrics ? <BarChartWidget data={getChartDataForType('network')} /> : <div className="text-xs text-muted-foreground flex items-center justify-center h-32">Analyzing sockets...</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Unknown element schema</div>
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