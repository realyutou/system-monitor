import { describe, expect, it } from 'vitest';
import { toDiskSnapshot } from './toDiskSnapshot';

describe('toDiskSnapshot', () => {
  it('returns an empty array for empty input', () => {
    expect(toDiskSnapshot([])).toEqual([]);
  });

  it('maps the latest DTO mounts into rows', () => {
    const rows = toDiskSnapshot([
      {
        mounts: [
          { fs: '/', usedBytes: 1, totalBytes: 2, usagePercent: 50 },
          { fs: '/data', usedBytes: 3, totalBytes: 4, usagePercent: 75 },
        ],
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ fs: '/', usage: 50 });
    expect(rows[1]).toEqual({ fs: '/data', usage: 75 });
  });

  it('only uses the last DTO when input has multiple', () => {
    const rows = toDiskSnapshot([
      {
        mounts: [{ fs: '/', usedBytes: 1, totalBytes: 10, usagePercent: 10 }],
      },
      {
        mounts: [
          { fs: '/data', usedBytes: 9, totalBytes: 10, usagePercent: 90 },
        ],
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ fs: '/data', usage: 90 });
  });
});
