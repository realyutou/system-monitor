import { useEffect, useState } from 'react';
import { getCpu } from '../lib/api';
import { toCpuSeries, type CpuChartRow } from '../lib/toCpuSeries';

export type CpuStatus = 'loading' | 'ok' | 'error';

export function useCpu() {
  const [data, setData] = useState<CpuChartRow[] | null>(null);
  const [status, setStatus] = useState<CpuStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    getCpu()
      .then((dto) => {
        if (cancelled) return;
        setData(toCpuSeries([dto]));
        setStatus('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, status };
}
