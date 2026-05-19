import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server.js';

describe('GET /api/metrics/disk', () => {
  it('returns 200 with mounts array containing at least one entry', async () => {
    const res = await request(createServer()).get('/api/metrics/disk');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Array.isArray(res.body.mounts)).toBe(true);
    expect(res.body.mounts.length).toBeGreaterThanOrEqual(1);
  });

  it('reports each mount with fs / usedBytes / totalBytes / usagePercent of correct types', async () => {
    const res = await request(createServer()).get('/api/metrics/disk');

    expect(res.status).toBe(200);
    for (const mount of res.body.mounts) {
      expect(mount).toEqual(
        expect.objectContaining({
          fs: expect.any(String),
          usagePercent: expect.any(Number),
        })
      );
      expect(Number.isInteger(mount.usedBytes)).toBe(true);
      expect(Number.isInteger(mount.totalBytes)).toBe(true);
    }
  });

  it('reports each mount within valid ranges and non-empty fs', async () => {
    const res = await request(createServer()).get('/api/metrics/disk');

    expect(res.status).toBe(200);
    for (const mount of res.body.mounts) {
      expect(mount.usagePercent).toBeGreaterThanOrEqual(0);
      expect(mount.usagePercent).toBeLessThanOrEqual(100);
      expect(mount.usedBytes).toBeLessThanOrEqual(mount.totalBytes);
      expect(mount.fs.length).toBeGreaterThan(0);
    }
  });

  it('excludes macOS firmlink / snapshot pseudo-mounts (no fs containing /System/Volumes/)', async () => {
    const res = await request(createServer()).get('/api/metrics/disk');

    expect(res.status).toBe(200);
    for (const mount of res.body.mounts) {
      expect(mount.fs).toEqual(expect.not.stringContaining('/System/Volumes/'));
    }
  });
});
