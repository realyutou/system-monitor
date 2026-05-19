import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { useHealth, type HealthStatus } from './hooks/useHealth';
import { CpuChart } from './components/CpuChart';
import { toCpuSeries, type CpuChartRow } from './lib/toCpuSeries';

const STATUS_LABEL: Record<HealthStatus, string> = {
  loading: '…',
  ok: 'ok',
  error: 'error',
};

export default function App() {
  const { status } = useHealth();
  const [cpuData, setCpuData] = useState<CpuChartRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/metrics/cpu')
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`cpu ${r.status}`)),
      )
      .then((dto) => {
        if (!cancelled) setCpuData(toCpuSeries([dto]));
      })
      .catch(() => {
        /* swallow — UI still mounts an empty chart */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />
      <header className={styles.header}>
        <section className={styles.readout} aria-label="System status">
          <span className={styles.label}>System</span>
          <span className={styles.divider} aria-hidden="true" />
          <span
            className={styles.dot}
            data-status={status}
            aria-hidden="true"
          />
          <p className={styles.line}>{`Backend: ${STATUS_LABEL[status]}`}</p>
        </section>
      </header>
      <section className={styles.main}>
        <CpuChart data={cpuData ?? []} />
      </section>
    </main>
  );
}
