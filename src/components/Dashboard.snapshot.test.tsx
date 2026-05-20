import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import {
  CPU_ENDPOINT,
  DISK_ENDPOINT,
  MEMORY_ENDPOINT,
} from '../lib/api';

const cssSource = readFileSync('src/App.module.css', 'utf8');
const fixedNow = new Date('2026-05-20T10:00:00.000Z');
const originalTimeZone = process.env.TZ;
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function installMetricFetchStubs() {
  const fetchStub = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);

    if (url === CPU_ENDPOINT) {
      return jsonResponse({
        usagePercent: 42,
        cores: 8,
        timestamp: '2026-05-20T10:00:00.000Z',
      });
    }

    if (url === MEMORY_ENDPOINT) {
      return jsonResponse({
        usedBytes: 4_000,
        totalBytes: 8_000,
        usagePercent: 50,
      });
    }

    if (url === DISK_ENDPOINT) {
      return jsonResponse({
        mounts: [
          {
            fs: '/',
            usedBytes: 6_000,
            totalBytes: 10_000,
            usagePercent: 60,
          },
        ],
      });
    }

    return Promise.reject(new Error(`unexpected url: ${url}`));
  });

  vi.stubGlobal('fetch', fetchStub);
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(document.documentElement, 'clientWidth', {
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

function installDeterministicClock() {
  process.env.TZ = 'Asia/Taipei';
  vi.useFakeTimers();
  vi.setSystemTime(fixedNow);
  vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    if (locales === 'en-GB') {
      return originalToLocaleTimeString.call(this, locales, options);
    }

    return '6:00:00 PM';
  });
}

async function flushMetricFetches() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function cssBlock(selector: string) {
  const escapedSelector = selector.replace('.', '\\.');
  const match = cssSource.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  expect(match, `${selector} block should exist`).not.toBeNull();
  return match?.[1] ?? '';
}

async function renderDashboardAt(width: number) {
  setViewportWidth(width);
  installDeterministicClock();
  installMetricFetchStubs();

  const result = render(<Dashboard />);

  await flushMetricFetches();

  expect(screen.getByText(/Last updated/i)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /CPU/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Memory/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Disk/i })).toBeInTheDocument();
  expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
  expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
  expect(screen.getByTestId('disk-chart')).toBeInTheDocument();

  return result;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
    return;
  }

  process.env.TZ = originalTimeZone;
});

describe('<Dashboard /> responsive snapshots', () => {
  it.each([
    ['desktop', 1280],
    ['tablet', 768],
    ['mobile', 375],
  ])('matches the %s viewport snapshot', async (_label, width) => {
    const { asFragment } = await renderDashboardAt(width);

    expect(asFragment()).toMatchSnapshot();
  });
});

describe('responsive CSS contracts', () => {
  it('removes fixed-width mobile blockers and vertical clipping', () => {
    expect(cssBlock('.main')).not.toMatch(/min-width:\s*640px/i);
    expect(cssBlock('.page')).not.toMatch(/overflow:\s*hidden/i);
    expect(cssBlock('.page')).toMatch(/overflow-y:\s*auto/i);
  });

  it('defines tablet and mobile layout breakpoints', () => {
    expect(cssSource).toMatch(/@media\s*\(max-width:\s*768px\)/i);
    expect(cssSource).toMatch(/@media\s*\(max-width:\s*480px\)/i);
  });

  it('constrains chart wrappers and rendered SVGs to the viewport width', () => {
    expect(cssBlock('.chartCard')).toMatch(/max-width:\s*100%/i);
    expect(cssSource).toMatch(
      /\.chartCard\s+\[role='img'\]\s*>\s*div\s*\{[^}]*width:\s*100%\s*!important/i,
    );
    expect(cssSource).toMatch(
      /\.chartCard\s+svg\s*\{[^}]*max-width:\s*100%/i,
    );
  });
});
