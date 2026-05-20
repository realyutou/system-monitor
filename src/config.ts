export function readNumberEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const POLL_INTERVAL_MS: number = readNumberEnv(
  import.meta.env.VITE_POLL_INTERVAL_MS,
  2000,
);

export const METRIC_HISTORY_LIMIT: number = readNumberEnv(
  import.meta.env.VITE_METRIC_HISTORY_LIMIT,
  30,
);
