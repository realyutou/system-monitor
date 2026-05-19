import styles from './App.module.css';
import { useHealth, type HealthStatus } from './hooks/useHealth';

const STATUS_LABEL: Record<HealthStatus, string> = {
  loading: '…',
  ok: 'ok',
  error: 'error',
};

export default function App() {
  const { status } = useHealth();

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
