import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { DiskMountBar } from '../lib/toDiskSnapshot';
import styles from '../App.module.css';

type DiskChartProps = {
  data: DiskMountBar[];
  width?: number;
  height?: number;
};

export function DiskChart({
  data,
  width = 600,
  height = 300,
}: DiskChartProps) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>Disk Usage</h3>
      <div data-testid="disk-chart" role="img" aria-label="Disk usage chart">
        <BarChart layout="vertical" width={width} height={height} data={data}>
          <XAxis type="number" domain={[0, 100]} />
          <YAxis
            type="category"
            dataKey="fs"
            width={100}
            tickFormatter={(fs: string) =>
              fs.split('/').filter(Boolean).pop() ?? fs
            }
          />
          <Bar dataKey="usage" fill="#9affc6" isAnimationActive={false} />
        </BarChart>
      </div>
    </div>
  );
}
