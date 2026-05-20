import { LineChart, Line, XAxis, YAxis } from 'recharts';
import type { MemoryChartRow } from '../lib/toMemorySeries';

type MemoryChartProps = {
  data: MemoryChartRow[];
  width?: number;
  height?: number;
};

export function MemoryChart({
  data,
  width = 600,
  height = 300,
}: MemoryChartProps) {
  return (
    <div data-testid="memory-chart" role="img" aria-label="Memory usage chart">
      <LineChart width={width} height={height} data={data}>
        <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} />
        <YAxis domain={[0, 100]} width={100} />
        <Line
          type="monotone"
          dataKey="usage"
          dot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
