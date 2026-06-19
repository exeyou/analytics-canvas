'use client';

import React, { useEffect, useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Canvas } from '../components/canvas/Canvas';
import { useDashboardStore } from '../store/useDashboardStore';

export default function DashboardPage() {
  const { addWidget } = useDashboardStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || over.id !== 'canvas-dropzone') return;

    const activeData = active.data.current;
    if (activeData && activeData.type) {
      addWidget({
        type: activeData.type.toUpperCase() as 'METRIC_CARD' | 'BAR_CHART' | 'NETWORK_CHART' | 'TEMP_CARD',
        title: activeData.title || 'Telemetry Widget',
      });
    }
  };

  if (!isMounted) {
    return <div className="flex h-screen bg-background items-center justify-center text-muted-foreground font-mono">Initializing operational UI...</div>;
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex w-full h-screen bg-background text-foreground overflow-hidden">
        <Sidebar />
        <Canvas />
      </div>
    </DndContext>
  );
}