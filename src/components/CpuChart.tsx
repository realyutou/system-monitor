import { LineChart, Line, XAxis, YAxis } from 'recharts';
import type { CpuChartRow } from '../lib/toCpuSeries';

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
  return (
    <div data-testid="cpu-chart" role="img" aria-label="CPU usage chart">
      <LineChart width={width} height={height} data={data}>
        <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} />
        <YAxis domain={[0, 100]} width={100} />
        <Line type="monotone" dataKey="usage" dot={{ r: 4 }} />
      </LineChart>
    </div>
  );
}
