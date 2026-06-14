export type WidgetType = 'LINE_CHART' | 'BAR_CHART' | 'METRIC_CARD' | 'TASK_LIST';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  settings?: {
    color?: string;
    metrics?: string[];
  };
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
  updatedAt: string;
}