import { useEffect, useRef, useState } from 'react';
import { POLL_INTERVAL_MS, METRIC_HISTORY_LIMIT } from '../config';

export type PollingStatus = 'loading' | 'ok' | 'error';

export function useMetricPolling<TDto, TRow>(
  fetcher: () => Promise<TDto>,
  transform: (dtos: TDto[]) => TRow[],
  intervalMs: number = POLL_INTERVAL_MS,
  historyLimit: number = METRIC_HISTORY_LIMIT,
): { data: TRow[] | null; status: PollingStatus } {
  const fetcherRef = useRef(fetcher);
  const transformRef = useRef(transform);
  fetcherRef.current = fetcher;
  transformRef.current = transform;

  const [history, setHistory] = useState<TDto[]>([]);
  const [status, setStatus] = useState<PollingStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const dto = await fetcherRef.current();
        if (cancelled) return;
        setHistory((prev) => {
          const next = [...prev, dto];
          return next.length > historyLimit ? next.slice(-historyLimit) : next;
        });
        setStatus('ok');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, historyLimit]);

  const data = history.length === 0 ? null : transformRef.current(history);
  return { data, status };
}
