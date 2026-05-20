import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DiskChart } from './DiskChart';
import { disk } from './DiskChart.fixtures';

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
});
