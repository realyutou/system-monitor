import type { MemoryChartRow } from '../lib/toMemorySeries';

const baseTime = Date.parse('2026-05-20T10:00:00Z');
const sec = 1000;

export const memory = {
  idle: [
    { time: baseTime + 0 * sec, usage: 50 },
    { time: baseTime + 2 * sec, usage: 52 },
    { time: baseTime + 4 * sec, usage: 49 },
  ] satisfies MemoryChartRow[],
  threeRows: [
    { time: baseTime + 0 * sec, usage: 50 },
    { time: baseTime + 2 * sec, usage: 52 },
    { time: baseTime + 4 * sec, usage: 49 },
  ] satisfies MemoryChartRow[],
  nineRows: [
    { time: baseTime + 0 * sec, usage: 40 },
    { time: baseTime + 17 * sec, usage: 42 },
    { time: baseTime + 23 * sec, usage: 45 },
    { time: baseTime + 38 * sec, usage: 47 },
    { time: baseTime + 49 * sec, usage: 50 },
    { time: baseTime + 56 * sec, usage: 53 },
    { time: baseTime + 71 * sec, usage: 55 },
    { time: baseTime + 78 * sec, usage: 58 },
    { time: baseTime + 90 * sec, usage: 60 },
  ] satisfies MemoryChartRow[],
};
