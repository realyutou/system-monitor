import type { DiskMetricDto } from './api';

export type DiskMountBar = { fs: string; usage: number };

export function toDiskSnapshot(dtos: DiskMetricDto[]): DiskMountBar[] {
  const latest = dtos[dtos.length - 1];
  return latest?.mounts.map((m) => ({ fs: m.fs, usage: m.usagePercent })) ?? [];
}
