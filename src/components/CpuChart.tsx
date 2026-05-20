import { LineChart, Line, XAxis, YAxis } from 'recharts';
import type { CpuChartRow } from '../lib/toCpuSeries';
import { formatChartTime } from '../lib/formatChartTime';
import { computeAnchoredTimeTicks } from '../lib/computeAnchoredTimeTicks';
import styles from '../App.module.css';

type CpuChartProps = {
  data: CpuChartRow[];
  width?: number;
  height?: number;
};

export function CpuChart({
  data,
  width = 600,
  height = 300,
}: CpuChartProps) {
  const anchoredTicks =
    data.length === 0
      ? []
      : computeAnchoredTimeTicks(data[0].time, data[data.length - 1].time);

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>CPU Usage</h3>
      <div data-testid="cpu-chart" role="img" aria-label="CPU usage chart">
        <LineChart
          width={width}
          height={height}
          data={data}
          margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
        >
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={anchoredTicks}
            tick={anchoredTicks.length === 0 ? false : undefined}
            tickFormatter={formatChartTime}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            width={100}
            tickFormatter={(v: number) => `${v} %`}
          />
          <Line
            type="monotone"
            dataKey="usage"
            dot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </div>
    </div>
  );
}
