import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';

const okCpu = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({
      usagePercent: 7,
      cores: 8,
      timestamp: '2026-05-20T10:00:00Z',
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<Dashboard />', () => {
  it('mounts all three chart testids on successful initial fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/metrics/cpu') return okCpu();
        if (url === '/api/metrics/memory') return okMemory();
        if (url === '/api/metrics/disk') return okDisk();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
    render(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByTestId('dashboard')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
    expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
    expect(screen.getByTestId('disk-chart')).toBeInTheDocument();
  });

  it('renders all three chart title headings on successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/metrics/cpu') return okCpu();
        if (url === '/api/metrics/memory') return okMemory();
        if (url === '/api/metrics/disk') return okDisk();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
    render(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /CPU/i })).toBeInTheDocument(),
    );
    expect(
      screen.getByRole('heading', { name: /Memory/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Disk/i }),
    ).toBeInTheDocument();
  });

  it('renders a last-updated timestamp near the disk chart after a successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/metrics/cpu') return okCpu();
        if (url === '/api/metrics/memory') return okMemory();
        if (url === '/api/metrics/disk') return okDisk();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
    render(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByText(/Last updated/i)).toBeInTheDocument(),
    );
  });

  it('renders an error notice when a metric fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/metrics/cpu') return okCpu();
        if (url === '/api/metrics/memory')
          return Promise.reject(new Error('network'));
        if (url === '/api/metrics/disk') return okDisk();
        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
    render(<Dashboard />);
    await waitFor(() =>
      expect(screen.getByText(/Memory.*unavailable/i)).toBeInTheDocument(),
    );
    expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
    expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
    expect(screen.getByTestId('disk-chart')).toBeInTheDocument();
  });
});
