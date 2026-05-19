import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App';

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

describe('<App />', () => {
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
        if (url === '/healthz')
          return Promise.reject(new Error('network'));
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => {})),
    );
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
