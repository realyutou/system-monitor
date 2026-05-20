import { useMetricPolling } from './useMetricPolling';
import { getDisk } from '../lib/api';
import { toDiskSnapshot } from '../lib/toDiskSnapshot';

export const useDisk = () => useMetricPolling(getDisk, toDiskSnapshot);
