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
      const widgetType = activeData.type.toUpperCase();

      addWidget({
        type: widgetType as 'METRIC_CARD' | 'BAR_CHART',
        title: activeData.title || 'New Widget',
      });
    }
  };

  if (!isMounted) {
    return <div className="flex h-screen bg-background items-center justify-center text-muted-foreground">Loading interface...</div>;
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