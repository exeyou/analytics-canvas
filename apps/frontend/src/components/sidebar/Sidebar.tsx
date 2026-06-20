'use client';

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { useDashboardStore, ListenerMap } from '../../store/useDashboardStore';
import { Activity, Database, Globe, Thermometer, Sliders, Power, PowerOff } from 'lucide-react';

interface SidebarItemProps {
  id: string;
  title: string;
  type: keyof ListenerMap;
  icon: React.ReactNode;
}

function SidebarItem({ id, title, type, icon }: SidebarItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: id,
    data: { title, type },
  });

  const activeListeners = useDashboardStore((state) => state.listeners);
  const isListening = activeListeners[type] ?? true;

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-xl bg-card transition-all shadow-sm ${
        isDragging ? 'opacity-50 border-primary' : 'border-border'
      }`}
    >
      <div {...listeners} {...attributes} className="flex items-center gap-3 cursor-grab active:cursor-grabbing flex-1">
        <div className="text-primary">{icon}</div>
        <div className="text-sm font-medium text-card-foreground">{title}</div>
      </div>

      <button
        onClick={() => useDashboardStore.getState().toggleListener(type)}
        className={`p-1.5 rounded-md transition-colors ${
          isListening ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-muted text-muted-foreground hover:bg-secondary'
        }`}
      >
        {isListening ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export function Sidebar() {
  const [intervalTime, setIntervalTime] = useState<number>(2000);

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setIntervalTime(value);
    window.dispatchEvent(new CustomEvent('change_ws_interval', { detail: value }));
  };

  return (
    <div className="w-64 border-r bg-card h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="font-bold text-lg mb-6 text-foreground px-2">Server Widgets</div>
        <div className="space-y-3">
          <SidebarItem id="draggable-metric-cpu" title="CPU Load Card" type="METRIC_CARD" icon={<Activity className="h-4 w-4" />} />
          <SidebarItem id="draggable-chart-ram" title="RAM Analytics Chart" type="BAR_CHART" icon={<Database className="h-4 w-4" />} />
          <SidebarItem id="draggable-chart-net" title="Network Interface Traffic" type="NETWORK_CHART" icon={<Globe className="h-4 w-4" />} />
          <SidebarItem id="draggable-metric-temp" title="CPU Temperature Sensor" type="TEMP_CARD" icon={<Thermometer className="h-4 w-4" />} />
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          <Sliders className="h-3 w-3" />
          <span>Stream Settings</span>
        </div>
        <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
          <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
            <span>Interval:</span>
            <span className="text-foreground font-bold">{intervalTime} ms</span>
          </div>
          <input
            type="range"
            min="200"
            max="5000"
            step="100"
            value={intervalTime}
            onChange={handleIntervalChange}
            className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
    </div>
  );
}