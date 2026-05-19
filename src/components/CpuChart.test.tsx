import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CpuChart } from './CpuChart';
import { cpu } from './CpuChart.fixtures';

afterEach(() => cleanup());

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
});
