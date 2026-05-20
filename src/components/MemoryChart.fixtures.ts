import type { MemoryChartRow } from '../lib/toMemorySeries';

const baseTime = Date.parse('2026-05-20T10:00:00Z');
const sec = 1000;

export const memory = {
  idle: [
    { time: baseTime + 0 * sec, usage: 50 },
    { time: baseTime + 2 * sec, usage: 52 },
    { time: baseTime + 4 * sec, usage: 49 },
  ] satisfies MemoryChartRow[],
};
