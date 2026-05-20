import { Children, isValidElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { YAxis } from 'recharts';
import { MemoryChart } from './MemoryChart';
import { memory } from './MemoryChart.fixtures';
import { formatChartTime } from '../lib/formatChartTime';

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

const originalTimeZone = process.env.TZ;

afterEach(() => {
  cleanup();
  if (originalTimeZone === undefined) {
    delete process.env.TZ;
    return;
  }

  process.env.TZ = originalTimeZone;
});

describe('<MemoryChart />', () => {
  it('renders an SVG path for non-empty data', () => {
    const { container } = render(
      <MemoryChart data={memory.idle} width={400} height={200} />,
    );
    expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('mounts even when data is empty', () => {
    render(<MemoryChart data={[]} width={400} height={200} />);
    expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
  });

  it('renders a visible Memory title heading', () => {
    render(<MemoryChart data={memory.idle} width={400} height={200} />);
    expect(
      screen.getByRole('heading', { name: /Memory/i }),
    ).toBeInTheDocument();
  });

  it('formats timestamp axis ticks as compact times', () => {
    process.env.TZ = 'Asia/Taipei';

    const { container } = render(
      <MemoryChart data={memory.idle} width={400} height={200} />,
    );

    expect(container.textContent).toContain('18:00:00');
    expect(container.textContent).not.toContain('10:00:00');
    expect(container.textContent).not.toContain(String(memory.idle[0].time));
  });

  it('formats Y axis ticks with a percent suffix', () => {
    const element = MemoryChart({
      data: memory.idle,
      width: 400,
      height: 200,
    });
    const formatter = findAxisTickFormatter(element, YAxis);
    expect(formatter).toBeDefined();
    expect(formatter!(50).slice(-2)).toBe(' %');
    expect(formatter!(0).slice(-2)).toBe(' %');
  });

  it('renders at least one percent-suffixed Y tick in the DOM', () => {
    const { container } = render(
      <MemoryChart data={memory.idle} width={400} height={200} />,
    );
    const text = container.textContent ?? '';
    const matches = ['0 %', '25 %', '50 %', '75 %', '100 %'].some((tick) =>
      text.includes(tick),
    );
    expect(matches).toBe(true);
  });

  it('renders five evenly spaced X ticks for a nine-row fixture', () => {
    process.env.TZ = 'Asia/Taipei';

    const { container } = render(
      <MemoryChart data={memory.nineRows} width={400} height={200} />,
    );
    const text = container.textContent ?? '';

    for (const i of [0, 2, 4, 6, 8]) {
      expect(text).toContain(formatChartTime(memory.nineRows[i].time));
    }
    for (const i of [1, 3, 5, 7]) {
      expect(text).not.toContain(formatChartTime(memory.nineRows[i].time));
    }
  });

  it('renders all X ticks when the fixture has fewer than five rows', () => {
    process.env.TZ = 'Asia/Taipei';

    const { container } = render(
      <MemoryChart data={memory.threeRows} width={400} height={200} />,
    );
    const text = container.textContent ?? '';

    for (const i of [0, 1, 2]) {
      expect(text).toContain(formatChartTime(memory.threeRows[i].time));
    }
  });
});
