export const HEALTHZ_ENDPOINT = '/healthz';

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(HEALTHZ_ENDPOINT);
  if (!res.ok) throw new Error(`healthz ${res.status}`);
  return res.json();
}

export const CPU_ENDPOINT = '/api/metrics/cpu';

export type CpuMetricDto = {
  usagePercent: number;
  cores: number;
  timestamp: string;
};

export async function getCpu(): Promise<CpuMetricDto> {
  const res = await fetch(CPU_ENDPOINT);
  if (!res.ok) throw new Error(`cpu ${res.status}`);
  return res.json();
}

export const MEMORY_ENDPOINT = '/api/metrics/memory';

export type MemoryMetricDto = {
  usedBytes: number;
  totalBytes: number;
  usagePercent: number;
};

export async function getMemory(): Promise<MemoryMetricDto> {
  const res = await fetch(MEMORY_ENDPOINT);
  if (!res.ok) throw new Error(`memory ${res.status}`);
  return res.json();
}

export const DISK_ENDPOINT = '/api/metrics/disk';

export type DiskMetricDto = {
  mounts: Array<{
    fs: string;
    usedBytes: number;
    totalBytes: number;
    usagePercent: number;
  }>;
};

export async function getDisk(): Promise<DiskMetricDto> {
  const res = await fetch(DISK_ENDPOINT);
  if (!res.ok) throw new Error(`disk ${res.status}`);
  return res.json();
}
