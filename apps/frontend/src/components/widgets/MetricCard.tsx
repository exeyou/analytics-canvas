import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  deviation: number;
  metricType: 'cpu' | 'temp' | 'ram' | 'network';
}

export function MetricCard({ title, value, deviation, metricType }: MetricCardProps) {
  const isPositive = deviation > 0;
  const isZero = deviation === 0;

  const sign = isPositive ? '+' : '';
  const displayLabel = `${sign}${deviation}%`;

  let badgeColor = 'text-emerald-500';

  if (!isZero) {
    if (metricType === 'cpu' || metricType === 'temp' || metricType === 'ram') {
      badgeColor = isPositive ? 'text-[#ef4444] font-semibold' : 'text-emerald-500';
    } else if (metricType === 'network') {
      badgeColor = 'text-emerald-500';
    }
  } else {
    badgeColor = 'text-muted-foreground';
  }

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between pb-1">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="text-xs mt-1 flex items-center gap-1 font-medium">
          <span className={`flex items-center gap-0.5 ${badgeColor}`}>
            {displayLabel}
            {!isZero && (
              isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}