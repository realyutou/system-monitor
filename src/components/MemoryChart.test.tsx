import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryChart } from './MemoryChart';
import { memory } from './MemoryChart.fixtures';

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
});
