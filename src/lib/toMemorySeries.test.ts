import { describe, expect, it } from 'vitest';
import { toMemorySeries, type MemoryChartRow } from './toMemorySeries';

describe('toMemorySeries', () => {
  it('returns an empty array for empty input', () => {
    expect(toMemorySeries([])).toEqual([]);
  });

  it('maps a single stamped DTO into a single { time, usage } row', () => {
    const rows: MemoryChartRow[] = toMemorySeries([
      {
        usedBytes: 1,
        totalBytes: 2,
        usagePercent: 50,
        timestamp: '2026-05-20T10:00:00Z',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe(Date.parse('2026-05-20T10:00:00Z'));
    expect(rows[0].usage).toBe(50);
  });

  it('preserves input order for multiple stamped DTOs', () => {
    const rows = toMemorySeries([
      {
        usedBytes: 1,
        totalBytes: 2,
        usagePercent: 40,
        timestamp: '2026-05-20T10:00:00Z',
      },
      {
        usedBytes: 1,
        totalBytes: 2,
        usagePercent: 42,
        timestamp: '2026-05-20T10:00:02Z',
      },
      {
        usedBytes: 1,
        totalBytes: 2,
        usagePercent: 38,
        timestamp: '2026-05-20T10:00:04Z',
      },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[0].time).toBeLessThan(rows[1].time);
    expect(rows[1].time).toBeLessThan(rows[2].time);
  });
});
