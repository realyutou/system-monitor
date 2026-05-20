import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryChart } from './MemoryChart';
import { memory } from './MemoryChart.fixtures';

afterEach(() => cleanup());

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
});
