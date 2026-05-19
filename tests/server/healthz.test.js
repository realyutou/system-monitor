import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server.js';

describe('GET /healthz', () => {
  it('returns 200 with { status: "ok" } as JSON', async () => {
    const res = await request(createServer()).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('returns 404 JSON with an error field for unknown routes', async () => {
    const res = await request(createServer()).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  });
});
