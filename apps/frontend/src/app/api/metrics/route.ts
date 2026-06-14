import { NextResponse } from 'next/server';

const getRandomValue = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1) + min);

export async function GET() {
  const now = new Date();
  const mockData = Array.from({ length: 6 }).map((_, index) => {
    const timeLabel = new Date(now.getTime() - (5 - index) * 60000)
      .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      time: timeLabel,
      uv: getRandomValue(1000, 5000),
      pv: getRandomValue(800, 4000),
      amt: getRandomValue(100, 1000),
    };
  });

  return NextResponse.json({
    summary: {
      totalViews: mockData.reduce((acc, curr) => acc + curr.uv, 0),
      activeUsers: mockData[mockData.length - 1].pv,
    },
    chartData: mockData,
  });
}