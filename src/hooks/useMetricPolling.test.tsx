import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMetricPolling } from './useMetricPolling';

const identity = <T,>(dtos: T[]): T[] => dtos;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useMetricPolling', () => {
  it('fetches once on mount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ x: 1 });
    const { result } = renderHook(() =>
      useMetricPolling(fetcher, identity, 2000),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('ok');
  });

  it('fetches once per intervalMs after the initial tick', async () => {
    const fetcher = vi.fn().mockResolvedValue({ x: 1 });
    renderHook(() => useMetricPolling(fetcher, identity, 2000));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('caps history at historyLimit (oldest discarded)', async () => {
    let n = 0;
    const fetcher = vi.fn(() => Promise.resolve({ n: ++n }));
    const { result } = renderHook(() =>
      useMetricPolling(fetcher, identity, 100, 3),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
    }
    expect(result.current.data).not.toBeNull();
    const data = result.current.data as Array<{ n: number }>;
    expect(data.length).toBeLessThanOrEqual(3);
    expect(data[data.length - 1].n).toBe(n);
  });

  it('returns "error" when fetcher rejects', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() =>
      useMetricPolling(fetcher, identity, 2000),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.data).toBeNull();
  });

  it('clears interval on unmount', async () => {
    const fetcher = vi.fn().mockResolvedValue({ x: 1 });
    const { unmount } = renderHook(() =>
      useMetricPolling(fetcher, identity, 100),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    const before = fetcher.mock.calls.length;
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(fetcher.mock.calls.length).toBe(before);
  });

  it('does not rebuild interval when caller passes a new inline fetcher reference', async () => {
    const baseFetcher = vi.fn().mockResolvedValue({ x: 1 });
    const { rerender } = renderHook(() =>
      useMetricPolling(() => baseFetcher(), identity, 100),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    rerender();
    rerender();
    rerender();
    expect(baseFetcher.mock.calls.length).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(baseFetcher.mock.calls.length).toBe(3);
  });
});
