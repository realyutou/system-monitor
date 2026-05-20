import { CpuChart } from './CpuChart';
import { MemoryChart } from './MemoryChart';
import { DiskChart } from './DiskChart';
import { useCpu } from '../hooks/useCpu';
import { useMemory } from '../hooks/useMemory';
import { useDisk } from '../hooks/useDisk';
import styles from '../App.module.css';

export function Dashboard() {
  const cpu = useCpu();
  const memory = useMemory();
  const disk = useDisk();

  return (
    <section data-testid="dashboard" className={styles.dashboard}>
      <CpuChart data={cpu.data ?? []} />
      {cpu.status === 'error' && (
        <p className={styles.notice}>CPU metric unavailable</p>
      )}
      <MemoryChart data={memory.data ?? []} />
      {memory.status === 'error' && (
        <p className={styles.notice}>Memory metric unavailable</p>
      )}
      <DiskChart data={disk.data ?? []} />
      {disk.lastUpdatedAt !== null && (
        <p className={styles.timestamp}>
          {`Last updated: ${new Date(disk.lastUpdatedAt).toLocaleTimeString()}`}
        </p>
      )}
      {disk.status === 'error' && (
        <p className={styles.notice}>Disk metric unavailable</p>
      )}
    </section>
  );
}
