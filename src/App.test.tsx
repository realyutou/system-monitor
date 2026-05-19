import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('<App />', () => {
  it('renders Backend: ok after a successful /healthz fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      }),
    );
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(/Backend: ok/i)).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith('/healthz');
  });

  it('does not crash when /healthz fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network')),
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
});
