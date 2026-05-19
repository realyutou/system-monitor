type CpuMetricDto = {
  usagePercent: number;
  cores: number;
  timestamp: string;
};

export type CpuChartRow = { time: number; usage: number };

export function toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[] {
  return dtos.map((d) => ({
    time: Date.parse(d.timestamp),
    usage: d.usagePercent,
  }));
}
