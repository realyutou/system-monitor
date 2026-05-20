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
  threeRows: [
    { time: baseTime + 0 * sec, usage: 6 },
    { time: baseTime + 2 * sec, usage: 8 },
    { time: baseTime + 4 * sec, usage: 5 },
  ] satisfies CpuChartRow[],
  nineRows: [
    { time: baseTime + 0 * sec, usage: 5 },
    { time: baseTime + 17 * sec, usage: 10 },
    { time: baseTime + 23 * sec, usage: 15 },
    { time: baseTime + 38 * sec, usage: 20 },
    { time: baseTime + 49 * sec, usage: 25 },
    { time: baseTime + 56 * sec, usage: 30 },
    { time: baseTime + 71 * sec, usage: 35 },
    { time: baseTime + 78 * sec, usage: 40 },
    { time: baseTime + 90 * sec, usage: 45 },
  ] satisfies CpuChartRow[],
};
