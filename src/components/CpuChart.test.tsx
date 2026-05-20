import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CpuChart } from './CpuChart';
import { cpu } from './CpuChart.fixtures';

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
});
