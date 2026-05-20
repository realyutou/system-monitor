import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { POLL_INTERVAL_MS } from './config';

const okHealth = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ status: 'ok' }),
  });

const okCpu = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      usagePercent: 7,
      cores: 8,
      timestamp: '2026-05-19T10:00:00Z',
    }),
  });

const okMemory = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({ usedBytes: 1, totalBytes: 2, usagePercent: 50 }),
  });

const okDisk = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      mounts: [{ fs: '/', usedBytes: 1, totalBytes: 2, usagePercent: 50 }],
    }),
  });

describe('<App /> static snapshot', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/healthz') return okHealth();
        if (url === '/api/metrics/cpu') return okCpu();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders Backend: ok after a successful /healthz fetch', async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(/Backend: ok/i)).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith('/healthz');
  });

  it('does not crash when /healthz fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/healthz') return Promise.reject(new Error('network'));
        if (url === '/api/metrics/cpu') return okCpu();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
    render(<App />);
    await waitFor(() =>
      expect(screen.queryByText(/Backend: ok/i)).not.toBeInTheDocument(),
    );
    expect(document.querySelector('main')).not.toBeNull();
  });

  it('starts in a non-ok state before the fetch resolves', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    render(<App />);
    expect(screen.queryByText(/Backend: ok/i)).toBeNull();
  });

  it('renders the CpuChart container after a successful /api/metrics/cpu fetch', async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('cpu-chart')).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith('/api/metrics/cpu');
  });

  it('renders the CpuChart container even when /api/metrics/cpu rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/healthz') return okHealth();
        if (url === '/api/metrics/cpu')
          return Promise.reject(new Error('network'));
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
    render(<App />);
    await waitFor(() =>
      expect(screen.getByTestId('cpu-chart')).toBeInTheDocument(),
    );
    expect(screen.getByText(/Backend: ok/i)).toBeInTheDocument();
  });
});

describe('<App /> polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/healthz') return okHealth();
        if (url === '/api/metrics/cpu') return okCpu();
        if (url === '/api/metrics/memory') return okMemory();
        if (url === '/api/metrics/disk') return okDisk();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('polls /api/metrics/cpu at the configured interval', async () => {
    render(<App />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const countCpu = () =>
      (
        global.fetch as unknown as { mock: { calls: Array<[string]> } }
      ).mock.calls.filter(([url]) => url === '/api/metrics/cpu').length;
    expect(countCpu()).toBeGreaterThanOrEqual(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(countCpu()).toBeGreaterThanOrEqual(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    });
    expect(countCpu()).toBeGreaterThanOrEqual(3);
  });
});
