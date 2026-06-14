import React from 'react';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  description?: string;
}

export function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <div className="p-2">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-500 flex items-center font-medium mr-1">
              +12% <ArrowUpRight className="h-3 w-3" />
            </span>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}