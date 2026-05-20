import { Children, isValidElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BarChart, XAxis } from 'recharts';
import { DiskChart } from './DiskChart';
import { disk } from './DiskChart.fixtures';

function findAxisTickFormatter(
  element: ReactElement,
  axisType: typeof XAxis,
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

function findChartProp(
  element: ReactElement,
  chartType: typeof BarChart,
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

afterEach(() => cleanup());

describe('<DiskChart />', () => {
  it('renders an SVG with bars for non-empty data', () => {
    const { container } = render(
      <DiskChart data={disk.idle} width={400} height={200} />,
    );
    expect(screen.getByTestId('disk-chart')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('mounts even when data is empty', () => {
    render(<DiskChart data={[]} width={400} height={200} />);
    expect(screen.getByTestId('disk-chart')).toBeInTheDocument();
  });

  it('renders a visible Disk title heading', () => {
    render(<DiskChart data={disk.idle} width={400} height={200} />);
    expect(
      screen.getByRole('heading', { name: /Disk/i }),
    ).toBeInTheDocument();
  });

  it('formats X axis ticks with a percent suffix', () => {
    const element = DiskChart({ data: disk.idle, width: 400, height: 200 });
    const formatter = findAxisTickFormatter(element, XAxis);
    expect(formatter).toBeDefined();
    expect(formatter!(0).slice(-2)).toBe(' %');
    expect(formatter!(100).slice(-2)).toBe(' %');
  });

  it('renders at least one percent-suffixed X tick in the DOM', () => {
    const { container } = render(
      <DiskChart data={disk.idle} width={400} height={200} />,
    );
    const text = container.textContent ?? '';
    const matches = ['0 %', '25 %', '50 %', '75 %', '100 %'].some((tick) =>
      text.includes(tick),
    );
    expect(matches).toBe(true);
  });

  it('passes BarChart margin.right >= 16', () => {
    const element = DiskChart({ data: disk.idle, width: 400, height: 200 });
    const margin = findChartProp(element, BarChart, 'margin') as
      | { right?: number }
      | undefined;
    expect(margin).toBeDefined();
    expect(margin!.right).toBeGreaterThanOrEqual(16);
  });
});
