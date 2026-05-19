import { describe, it, expect } from 'vitest';
import { toCpuSeries, type CpuChartRow } from './toCpuSeries';
import type { CpuMetricDto } from './api';

describe('toCpuSeries', () => {
  it('returns an empty array for empty input', () => {
    expect(toCpuSeries([])).toEqual([]);
  });

  it('maps a single DTO into a single { time, usage } row', () => {
    const dto: CpuMetricDto = {
      usagePercent: 42,
      cores: 8,
      timestamp: '2026-05-19T10:00:00Z',
    };
    const rows: CpuChartRow[] = toCpuSeries([dto]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      time: Date.parse('2026-05-19T10:00:00Z'),
      usage: 42,
    });
  });

  it('preserves input order for multiple DTOs', () => {
    const dtos: CpuMetricDto[] = [
      { usagePercent: 5, cores: 8, timestamp: '2026-05-19T10:00:00Z' },
      { usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:02Z' },
      { usagePercent: 9, cores: 8, timestamp: '2026-05-19T10:00:04Z' },
    ];
    const rows = toCpuSeries(dtos);
    expect(rows).toHaveLength(3);
    expect(rows[0].time).toBeLessThan(rows[1].time);
    expect(rows[1].time).toBeLessThan(rows[2].time);
  });
});
