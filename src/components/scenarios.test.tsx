import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { loadFixture, scenarioNames } from '../../tests/fixtures/systemScenarios';
import { CpuChart } from './CpuChart';
import { MemoryChart } from './MemoryChart';
import { DiskChart } from './DiskChart';
import { toCpuSeries } from '../lib/toCpuSeries';
import { toMemorySeries } from '../lib/toMemorySeries';
import { toDiskSnapshot } from '../lib/toDiskSnapshot';

afterEach(() => cleanup());

describe('frontend metric scenario fixtures', () => {
  describe.each(scenarioNames)('%s', (name) => {
    it('replays CPU DTOs through the chart helper and component', () => {
      const fixture = loadFixture(name);
      const rows = toCpuSeries(fixture.cpu.expectedDtos);
      const { container } = render(
        <CpuChart data={rows} width={400} height={200} />,
      );

      expect(rows).toEqual(fixture.cpu.expectedChartRows);
      expect(screen.getByTestId('cpu-chart')).toBeInTheDocument();
      expect(container.querySelector('svg')).not.toBeNull();
      expect(container.querySelector('path')).not.toBeNull();
    });

    it('replays memory DTOs through the chart helper and component', () => {
      const fixture = loadFixture(name);
      const rows = toMemorySeries(fixture.memory.expectedStampedDtos);
      const { container } = render(
        <MemoryChart data={rows} width={400} height={200} />,
      );

      expect(rows).toEqual(fixture.memory.expectedChartRows);
      expect(screen.getByTestId('memory-chart')).toBeInTheDocument();
      expect(container.querySelector('svg')).not.toBeNull();
      expect(container.querySelector('path')).not.toBeNull();
    });

    it('replays disk DTOs through the chart helper and component', () => {
      const fixture = loadFixture(name);
      const rows = toDiskSnapshot([fixture.disk.expectedDto]);
      const { container } = render(
        <DiskChart data={rows} width={400} height={200} />,
      );

      expect(rows).toEqual(fixture.disk.expectedChartRows);
      expect(screen.getByTestId('disk-chart')).toBeInTheDocument();
      expect(container.querySelector('svg')).not.toBeNull();
      for (const row of fixture.disk.expectedChartRows) {
        expect(container.textContent).toContain(row.fs);
      }
    });
  });
});
