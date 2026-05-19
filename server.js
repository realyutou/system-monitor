import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { metricsRouter } from './server/metricsRouter.js';

export const PORT = 3001;

export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.url?.startsWith('/api/metrics/')) {
      const handled = await metricsRouter(req, res);
      if (handled) return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}
