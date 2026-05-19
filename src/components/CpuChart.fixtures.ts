import type { CpuChartRow } from '../lib/toCpuSeries';

const baseTime = Date.parse('2026-05-19T10:00:00Z');
const sec = 1000;

export const cpu = {
  idle: [
    { time: baseTime + 0 * sec, usage: 6 },
    { time: baseTime + 2 * sec, usage: 8 },
    { time: baseTime + 4 * sec, usage: 5 },
    { time: baseTime + 6 * sec, usage: 12 },
    { time: baseTime + 8 * sec, usage: 9 },
  ] satisfies CpuChartRow[],
};
