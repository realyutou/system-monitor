import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server.js';

describe('GET /api/metrics/cpu', () => {
  it('returns 200 with usagePercent / cores / timestamp as JSON', async () => {
    const res = await request(createServer()).get('/api/metrics/cpu');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual(
      expect.objectContaining({
        usagePercent: expect.any(Number),
        cores: expect.any(Number),
        timestamp: expect.any(String),
      })
    );
  });

  it('reports usagePercent within [0, 100]', async () => {
    const res = await request(createServer()).get('/api/metrics/cpu');

    expect(res.status).toBe(200);
    expect(res.body.usagePercent).toBeGreaterThanOrEqual(0);
    expect(res.body.usagePercent).toBeLessThanOrEqual(100);
  });

  it('reports cores as a positive integer', async () => {
    const res = await request(createServer()).get('/api/metrics/cpu');

    expect(res.status).toBe(200);
    expect(Number.isInteger(res.body.cores)).toBe(true);
    expect(res.body.cores).toBeGreaterThanOrEqual(1);
  });

  it('reports timestamp as an ISO 8601 string parseable by new Date()', async () => {
    const res = await request(createServer()).get('/api/metrics/cpu');

    expect(res.status).toBe(200);
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
