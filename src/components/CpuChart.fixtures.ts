import type { CpuChartRow } from '../lib/toCpuSeries';

const baseTime = Date.parse('2026-05-19T10:00:00Z');
const sec = 1000;

// nineRowsBase is offset 7s from baseTime so it is NOT aligned to a 15s boundary.
// Span is 65s — wide enough that computeAnchoredTimeTicks emits four 15s-multiple ticks
// (15s, 30s, 45s, 60s past baseTime) inside [first.time, last.time].
const nineRowsBase = baseTime + 7 * sec;

// shortSpanBase is offset 1s from baseTime so the closed range [+1s, +9s]
// excludes baseTime itself and the next 15s multiple, producing 0 anchored ticks.
const shortSpanBase = baseTime + 1 * sec;

export const cpu = {
  idle: [
    { time: baseTime + 0 * sec, usage: 6 },
    { time: baseTime + 2 * sec, usage: 8 },
    { time: baseTime + 4 * sec, usage: 5 },
    { time: baseTime + 6 * sec, usage: 12 },
    { time: baseTime + 8 * sec, usage: 9 },
  ] satisfies CpuChartRow[],
  nineRows: [
    { time: nineRowsBase + 0 * sec, usage: 5 },
    { time: nineRowsBase + 6 * sec, usage: 10 },
    { time: nineRowsBase + 13 * sec, usage: 15 },
    { time: nineRowsBase + 22 * sec, usage: 20 },
    { time: nineRowsBase + 31 * sec, usage: 25 },
    { time: nineRowsBase + 38 * sec, usage: 30 },
    { time: nineRowsBase + 47 * sec, usage: 35 },
    { time: nineRowsBase + 56 * sec, usage: 40 },
    { time: nineRowsBase + 65 * sec, usage: 45 },
  ] satisfies CpuChartRow[],
  shortSpan: [
    { time: shortSpanBase + 0 * sec, usage: 5 },
    { time: shortSpanBase + 2 * sec, usage: 7 },
    { time: shortSpanBase + 4 * sec, usage: 9 },
    { time: shortSpanBase + 6 * sec, usage: 11 },
    { time: shortSpanBase + 8 * sec, usage: 13 },
  ] satisfies CpuChartRow[],
};
