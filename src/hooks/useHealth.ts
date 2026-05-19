import { useEffect, useState } from 'react';
import { getHealth } from '../lib/api';

export type HealthStatus = 'loading' | 'ok' | 'error';

export function useHealth() {
  const [status, setStatus] = useState<HealthStatus>('loading');
  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((res) => {
        if (!cancelled) setStatus(res.status === 'ok' ? 'ok' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { status };
}
