import type { MemoryChartRow } from '../lib/toMemorySeries';

const baseTime = Date.parse('2026-05-20T10:00:00Z');
const sec = 1000;

// nineRowsBase is offset 7s from baseTime so it is NOT aligned to a 15s boundary.
// Span is 65s — wide enough that computeAnchoredTimeTicks emits four 15s-multiple ticks
// (15s, 30s, 45s, 60s past baseTime) inside [first.time, last.time].
const nineRowsBase = baseTime + 7 * sec;

// shortSpanBase is offset 1s from baseTime so the closed range [+1s, +9s]
// excludes baseTime itself and the next 15s multiple, producing 0 anchored ticks.
const shortSpanBase = baseTime + 1 * sec;

export const memory = {
  idle: [
    { time: baseTime + 0 * sec, usage: 50 },
    { time: baseTime + 2 * sec, usage: 52 },
    { time: baseTime + 4 * sec, usage: 49 },
  ] satisfies MemoryChartRow[],
  nineRows: [
    { time: nineRowsBase + 0 * sec, usage: 40 },
    { time: nineRowsBase + 6 * sec, usage: 42 },
    { time: nineRowsBase + 13 * sec, usage: 45 },
    { time: nineRowsBase + 22 * sec, usage: 47 },
    { time: nineRowsBase + 31 * sec, usage: 50 },
    { time: nineRowsBase + 38 * sec, usage: 53 },
    { time: nineRowsBase + 47 * sec, usage: 55 },
    { time: nineRowsBase + 56 * sec, usage: 58 },
    { time: nineRowsBase + 65 * sec, usage: 60 },
  ] satisfies MemoryChartRow[],
  shortSpan: [
    { time: shortSpanBase + 0 * sec, usage: 40 },
    { time: shortSpanBase + 2 * sec, usage: 41 },
    { time: shortSpanBase + 4 * sec, usage: 42 },
    { time: shortSpanBase + 6 * sec, usage: 43 },
    { time: shortSpanBase + 8 * sec, usage: 44 },
  ] satisfies MemoryChartRow[],
};
