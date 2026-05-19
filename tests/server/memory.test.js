import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server.js';

describe('GET /api/metrics/memory', () => {
  it('returns 200 with usedBytes / totalBytes / usagePercent as JSON', async () => {
    const res = await request(createServer()).get('/api/metrics/memory');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual(
      expect.objectContaining({
        usedBytes: expect.any(Number),
        totalBytes: expect.any(Number),
        usagePercent: expect.any(Number),
      })
    );
  });

  it('reports usedBytes and totalBytes as non-negative integers with totalBytes >= 1', async () => {
    const res = await request(createServer()).get('/api/metrics/memory');

    expect(res.status).toBe(200);
    expect(Number.isInteger(res.body.usedBytes)).toBe(true);
    expect(Number.isInteger(res.body.totalBytes)).toBe(true);
    expect(res.body.usedBytes).toBeGreaterThanOrEqual(0);
    expect(res.body.totalBytes).toBeGreaterThanOrEqual(1);
  });

  it('reports usagePercent within [0, 100]', async () => {
    const res = await request(createServer()).get('/api/metrics/memory');

    expect(res.status).toBe(200);
    expect(res.body.usagePercent).toBeGreaterThanOrEqual(0);
    expect(res.body.usagePercent).toBeLessThanOrEqual(100);
  });

  it('reports usedBytes <= totalBytes', async () => {
    const res = await request(createServer()).get('/api/metrics/memory');

    expect(res.status).toBe(200);
    expect(res.body.usedBytes).toBeLessThanOrEqual(res.body.totalBytes);
  });
});
