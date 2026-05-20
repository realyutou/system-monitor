import { Children, isValidElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LineChart, XAxis, YAxis } from 'recharts';
import { CpuChart } from './CpuChart';
import { cpu } from './CpuChart.fixtures';
import { formatChartTime } from '../lib/formatChartTime';
import { computeAnchoredTimeTicks } from '../lib/computeAnchoredTimeTicks';

function findAxisTickFormatter(
  element: ReactElement,
  axisType: typeof YAxis,
): ((value: number) => string) | undefined {
  let found: ((value: number) => string) | undefined;
  const visit = (node: unknown) => {
    if (!isValidElement(node)) return;
    if (node.type === axisType) {
      const formatter = (node.props as { tickFormatter?: (v: number) => string })
        .tickFormatter;
      if (formatter) found = formatter;
    }
    const children = (node.props as { children?: unknown }).children;
    Children.forEach(children, visit);
  };
  visit(element);
  return found;
}

function findAxisProp(
  element: ReactElement,
  axisType: typeof XAxis | typeof YAxis,
  propName: string,
): unknown {
  let found: unknown;
  const visit = (node: unknown) => {
    if (!isValidElement(node)) return;
    if (node.type === axisType) {
      const value = (node.props as Record<string, unknown>)[propName];
      if (value !== undefined) found = value;
    }
    const children = (node.props as { children?: unknown }).children;
    Children.forEach(children, visit);
  };
  visit(element);
  return found;
}

function findChartProp(
  element: ReactElement,
  chartType: typeof LineChart,
  propName: string,
): unknown {
  if (!isValidElement(element)) return undefined;
  if (element.type === chartType) {
    return (element.props as Record<string, unknown>)[propName];
  }
  let found: unknown;
  const visit = (node: unknown) => {
    if (!isValidElement(node)) return;
    if (node.type === chartType) {
      found = (node.props as Record<string, unknown>)[propName];
      return;
    }
    const children = (node.props as { children?: unknown }).children;
    Children.forEach(children, visit);
  };
  visit(element);
  return found;
}

const originalTimeZone = process.env.TZ;

afterEach(() => {
  cleanup();
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
    return;
  }

  process.env.TZ = originalTimeZone;
});

describe('<CpuChart />', () => {
  it('renders an SVG path for non-empty data', () => {
    const { container } = render(
      <CpuChart data={cpu.idle} width={400} height={200} />,
    );
    expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('mounts even when data is empty', () => {
    render(<CpuChart data={[]} width={400} height={200} />);
    expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
  });

  it('renders a visible CPU title heading', () => {
    render(<CpuChart data={cpu.idle} width={400} height={200} />);
    expect(
      screen.getByRole('heading', { name: /CPU/i }),
    ).toBeInTheDocument();
  });

  it('formats timestamp axis ticks as compact times', () => {
    process.env.TZ = 'Asia/Taipei';

    const { container } = render(
      <CpuChart data={cpu.idle} width={400} height={200} />,
    );

    expect(container.textContent).toContain('18:00:00');
    expect(container.textContent).not.toContain('10:00:00');
    expect(container.textContent).not.toContain(String(cpu.idle[0].time));
  });

  it('formats Y axis ticks with a percent suffix', () => {
    const element = CpuChart({ data: cpu.idle, width: 400, height: 200 });
    const formatter = findAxisTickFormatter(element, YAxis);
    expect(formatter).toBeDefined();
    expect(formatter!(50).slice(-2)).toBe(' %');
    expect(formatter!(0).slice(-2)).toBe(' %');
  });

  it('renders at least one percent-suffixed Y tick in the DOM', () => {
    const { container } = render(
      <CpuChart data={cpu.idle} width={400} height={200} />,
    );
    const text = container.textContent ?? '';
    const matches = ['0 %', '25 %', '50 %', '75 %', '100 %'].some((tick) =>
      text.includes(tick),
    );
    expect(matches).toBe(true);
  });

  it('renders at least three 15s-multiple anchored ticks for a 60s+ fixture', () => {
    process.env.TZ = 'Asia/Taipei';

    const { container } = render(
      <CpuChart data={cpu.nineRows} width={400} height={200} />,
    );
    const text = container.textContent ?? '';

    const ticks = computeAnchoredTimeTicks(
      cpu.nineRows[0].time,
      cpu.nineRows[cpu.nineRows.length - 1].time,
    );
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    for (const t of ticks) {
      expect(t % 15_000).toBe(0);
      expect(text).toContain(formatChartTime(t));
    }
  });

  it('does not render fixture[1] timestamp when it is not a 15s multiple', () => {
    process.env.TZ = 'Asia/Taipei';

    expect(cpu.nineRows[1].time % 15_000).not.toBe(0);

    const { container } = render(
      <CpuChart data={cpu.nineRows} width={400} height={200} />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain(formatChartTime(cpu.nineRows[1].time));
  });

  it('does not render any HH:MM:SS substring when data is empty', () => {
    const { container } = render(
      <CpuChart data={[]} width={400} height={200} />,
    );
    expect(container.textContent ?? '').not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('passes XAxis padding.left >= 8', () => {
    const element = CpuChart({ data: cpu.idle, width: 400, height: 200 });
    const padding = findAxisProp(element, XAxis, 'padding') as
      | { left?: number }
      | undefined;
    expect(padding).toBeDefined();
    expect(padding!.left).toBeGreaterThanOrEqual(8);
  });

  it('passes LineChart margin.right >= 16 and margin.left >= 4', () => {
    const element = CpuChart({ data: cpu.idle, width: 400, height: 200 });
    const margin = findChartProp(element, LineChart, 'margin') as
      | { right?: number; left?: number }
      | undefined;
    expect(margin).toBeDefined();
    expect(margin!.right).toBeGreaterThanOrEqual(16);
    expect(margin!.left).toBeGreaterThanOrEqual(4);
  });

  it('does not render any HH:MM:SS substring when data span has no 15s multiple', () => {
    process.env.TZ = 'Asia/Taipei';
    const { container } = render(
      <CpuChart data={cpu.shortSpan} width={400} height={200} />,
    );
    expect(container.textContent ?? '').not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('passes tick={false} to XAxis when no anchored ticks fall in range', () => {
    const element = CpuChart({
      data: cpu.shortSpan,
      width: 400,
      height: 200,
    });
    expect(findAxisProp(element, XAxis, 'tick')).toBe(false);
  });

  it('does not pass tick={false} to XAxis when anchored ticks exist', () => {
    const element = CpuChart({
      data: cpu.nineRows,
      width: 400,
      height: 200,
    });
    expect(findAxisProp(element, XAxis, 'tick')).not.toBe(false);
  });

  it('passes tick={false} to XAxis when data is empty', () => {
    const element = CpuChart({ data: [], width: 400, height: 200 });
    expect(findAxisProp(element, XAxis, 'tick')).toBe(false);
  });
});
