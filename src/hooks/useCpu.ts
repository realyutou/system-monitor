import { useMetricPolling } from './useMetricPolling';
import { getCpu } from '../lib/api';
import { toCpuSeries } from '../lib/toCpuSeries';

export const useCpu = () => useMetricPolling(getCpu, toCpuSeries);
