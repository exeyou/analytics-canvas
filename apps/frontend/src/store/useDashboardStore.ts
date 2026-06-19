import { create } from 'zustand';

export interface Widget {
  id: string;
  type: 'METRIC_CARD' | 'BAR_CHART' | 'NETWORK_CHART' | 'TEMP_CARD';
  title: string;
}

interface DashboardState {
  widgets: Widget[];
  setWidgets: (widgets: Widget[]) => void;
  addWidget: (widget: Omit<Widget, 'id'>) => Widget[];
  removeWidget: (id: string) => Widget[];
}

export const useDashboardStore = create<DashboardState>((set) => ({
  widgets: [],
  setWidgets: (widgets) => set({ widgets }),
  addWidget: (newWidget) => {
    let updated: Widget[] = [];
    set((state) => {
      const filteredWidgets = state.widgets.filter((w) => w.type !== newWidget.type);
      const createdWidget: Widget = {
        ...newWidget,
        id: `${newWidget.type}-${Date.now()}`,
      };
      updated = [...filteredWidgets, createdWidget];
      return { widgets: updated };
    });
    return updated;
  },
  removeWidget: (id) => {
    let updated: Widget[] = [];
    set((state) => {
      updated = state.widgets.filter((w) => w.id !== id);
      return { widgets: updated };
    });
    return updated;
  },
}));