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
