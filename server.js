import http from 'node:http';
import { fileURLToPath } from 'node:url';
import * as si from 'systeminformation';

export const PORT = 3001;

const FS_TYPES = new Set(['apfs', 'ext4', 'ext3', 'ext2', 'xfs', 'btrfs', 'zfs', 'ntfs', 'vfat', 'exfat']);

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

    if (req.method === 'GET' && req.url === '/api/metrics/disk') {
      try {
        const fs = await si.fsSize();
        const mounts = fs
          .filter((m) => FS_TYPES.has(m.type?.toLowerCase()) && m.size > 0 && !m.mount.startsWith('/System/Volumes/'))
          .map((m) => ({
            fs: m.fs,
            usedBytes: m.used,
            totalBytes: m.size,
            usagePercent: m.use,
          }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ mounts }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'disk sample failed' }));
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
