import { afterEach, describe, expect, it } from 'vitest';
import { formatChartTime } from './formatChartTime';

const originalTimeZone = process.env.TZ;
const sampleTime = Date.parse('2026-05-20T10:00:00Z');

afterEach(() => {
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
    return;
  }

  process.env.TZ = originalTimeZone;
});

describe('formatChartTime', () => {
  it('formats timestamps in the runtime local time zone', () => {
    process.env.TZ = 'Asia/Taipei';

    expect(formatChartTime(sampleTime)).toBe('18:00:00');
    expect(formatChartTime(sampleTime)).not.toBe('10:00:00');
  });
});
