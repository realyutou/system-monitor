import * as si from 'systeminformation';

const FS_TYPES = new Set(['apfs', 'ext4', 'ext3', 'ext2', 'xfs', 'btrfs', 'zfs', 'ntfs', 'vfat', 'exfat']);

export function toCpuMetricDto(load, timestamp) {
  return {
    usagePercent: load.currentLoad,
    cores: load.cpus.length,
    timestamp,
  };
}

export async function readCpu() {
  const load = await si.currentLoad();
  return toCpuMetricDto(load, new Date().toISOString());
}

export function toMemoryMetricDto(m) {
  return {
    usedBytes: m.active,
    totalBytes: m.total,
    usagePercent: (m.active / m.total) * 100,
  };
}

export async function readMemory() {
  const m = await si.mem();
  return toMemoryMetricDto(m);
}

export function toDiskMetricDto(fs) {
  return {
    mounts: fs
      .filter((m) => FS_TYPES.has(m.type?.toLowerCase()) && m.size > 0 && !m.mount.startsWith('/System/Volumes/'))
      .map((m) => ({
        fs: m.fs,
        usedBytes: m.used,
        totalBytes: m.size,
        usagePercent: m.use,
      })),
  };
}

export async function readDisk() {
  const fs = await si.fsSize();
  return toDiskMetricDto(fs);
}

const HANDLERS = { cpu: readCpu, memory: readMemory, disk: readDisk };

export async function metricsRouter(req, res) {
  if (req.method !== 'GET' || !req.url?.startsWith('/api/metrics/')) return false;
  const name = req.url.slice('/api/metrics/'.length);
  const handler = HANDLERS[name];
  if (!handler) return false;
  try {
    const dto = await handler();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dto));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `${name} sample failed` }));
  }
  return true;
}
