import { create } from 'zustand';

export interface Widget {
  id: string;
  type: 'METRIC_CARD' | 'BAR_CHART' | 'NETWORK_CHART' | 'TEMP_CARD';
  title: string;
}

export interface ListenerMap {
  METRIC_CARD: boolean;
  BAR_CHART: boolean;
  NETWORK_CHART: boolean;
  TEMP_CARD: boolean;
}

interface DashboardState {
  widgets: Widget[];
  listeners: ListenerMap;
  socket: WebSocket | null;
  isInitialized: boolean;
  setSocket: (socket: WebSocket | null) => void;
  setWidgets: (widgets: Widget[]) => void;
  setListeners: (listeners: ListenerMap) => void;
  setInitialized: (initialized: boolean) => void;
  addWidget: (widget: Omit<Widget, 'id'>) => void;
  removeWidget: (id: string) => void;
  toggleListener: (type: keyof ListenerMap) => void;
}

const syncWithServer = (socket: WebSocket | null, widgets: Widget[], listeners: ListenerMap, isInitialized: boolean) => {
  if (!isInitialized) return;
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      action: 'SAVE_LAYOUT',
      widgets,
      listeners
    }));
  }
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  widgets: [],
  listeners: {
    METRIC_CARD: true,
    BAR_CHART: true,
    NETWORK_CHART: true,
    TEMP_CARD: true,
  },
  socket: null,
  isInitialized: false,

  setSocket: (socket) => set({ socket }),
  setWidgets: (widgets) => set({ widgets }),
  setListeners: (listeners) => set({ listeners }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),

  addWidget: (newWidget) => {
    const createdWidget: Widget = {
      ...newWidget,
      id: `${newWidget.type}-${Date.now()}`,
    };
    const filteredWidgets = get().widgets.filter((w) => w.type !== newWidget.type);
    const updatedWidgets = [...filteredWidgets, createdWidget];

    set({ widgets: updatedWidgets });
    syncWithServer(get().socket, updatedWidgets, get().listeners, get().isInitialized);
  },

  removeWidget: (id) => {
    const updatedWidgets = get().widgets.filter((w) => w.id !== id);

    set({ widgets: updatedWidgets });
    syncWithServer(get().socket, updatedWidgets, get().listeners, get().isInitialized);
  },

  toggleListener: (type) => {
    const updatedListeners = {
      ...get().listeners,
      [type]: !get().listeners[type],
    };

    set({ listeners: updatedListeners });
    syncWithServer(get().socket, get().widgets, updatedListeners, get().isInitialized);
  },
}));