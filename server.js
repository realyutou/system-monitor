import http from 'node:http';
import { fileURLToPath } from 'node:url';
import * as si from 'systeminformation';

export const PORT = 3001;

async function readCpu() {
  const load = await si.currentLoad();
  return {
    usagePercent: load.currentLoad,
    cores: load.cpus.length,
    timestamp: new Date().toISOString(),
  };
}

export function createServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (req.method === 'GET' && req.url === '/api/metrics/cpu') {
      try {
        const dto = await readCpu();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(dto));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'cpu sample failed' }));
      }
      return;
    }

    if (req.method === 'GET' && req.url === '/api/metrics/memory') {
      try {
        const m = await si.mem();
        const usedBytes = m.active;
        const totalBytes = m.total;
        const usagePercent = (m.active / m.total) * 100;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ usedBytes, totalBytes, usagePercent }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'memory sample failed' }));
      }
      return;
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
