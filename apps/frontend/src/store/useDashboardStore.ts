import { create } from 'zustand';

interface Widget {
  id: string;
  type: 'METRIC_CARD' | 'BAR_CHART' | 'NETWORK_CHART' | 'TEMP_CARD';
  title: string;
}

interface DashboardState {
  widgets: Widget[];
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  removeWidget: (id: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  widgets: [],
  addWidget: (newWidget) =>
    set((state) => {
      const filteredWidgets = state.widgets.filter((w) => w.type !== newWidget.type);

      const createdWidget: Widget = {
        ...newWidget,
        id: `${newWidget.type}-${Date.now()}`,
      };

      return {
        widgets: [...filteredWidgets, createdWidget],
      };
    }),
  removeWidget: (id) =>
    set((state) => ({
      widgets: state.widgets.filter((w) => w.id !== id),
    })),
}));