import { useEffect, useState } from 'react';
import styles from './App.module.css';

type HealthStatus = 'loading' | 'ok' | 'error';

const STATUS_LABEL: Record<HealthStatus, string> = {
  loading: '…',
  ok: 'ok',
  error: 'error',
};

export default function App() {
  const [status, setStatus] = useState<HealthStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/healthz')
      .then((res) => {
        if (!res.ok) throw new Error(`healthz ${res.status}`);
        return res.json();
      })
      .then((body: { status?: string }) => {
        if (cancelled) return;
        setStatus(body.status === 'ok' ? 'ok' : 'error');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden="true" />
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
    </main>
  );
}
