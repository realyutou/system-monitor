import type { MemoryMetricDto } from './api';

export type MemoryChartRow = { time: number; usage: number };
export type StampedMemoryDto = MemoryMetricDto & { timestamp: string };

export function toMemorySeries(dtos: StampedMemoryDto[]): MemoryChartRow[] {
  return dtos.map((d) => ({
    time: Date.parse(d.timestamp),
    usage: d.usagePercent,
  }));
}
