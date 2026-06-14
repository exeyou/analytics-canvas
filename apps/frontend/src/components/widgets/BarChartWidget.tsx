'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface BarChartWidgetProps {
  data: Array<{ time: string; uv: number; pv: number }>;
}

export function BarChartWidget({ data }: BarChartWidgetProps) {
  return (
    <div className="w-full h-36 mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(229, 231, 235, 0.3)" />
          <XAxis 
            dataKey="time" 
            stroke="#888888" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#888888" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <Tooltip 
            contentStyle={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar 
            dataKey="uv" 
            fill="#2563eb" 
            radius={[4, 4, 0, 0]} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}