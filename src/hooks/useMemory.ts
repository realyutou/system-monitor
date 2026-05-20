import { useMetricPolling } from './useMetricPolling';
import { getMemory } from '../lib/api';
import {
  toMemorySeries,
  type StampedMemoryDto,
} from '../lib/toMemorySeries';

const getStampedMemory = async (): Promise<StampedMemoryDto> => ({
  ...(await getMemory()),
  timestamp: new Date().toISOString(),
});

export const useMemory = () =>
  useMetricPolling(getStampedMemory, toMemorySeries);
