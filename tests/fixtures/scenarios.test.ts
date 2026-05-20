import { describe, expect, it } from 'vitest';
import { loadFixture, scenarioNames } from './systemScenarios';

describe('loadFixture', () => {
  it('loads the three canonical roadmap scenario fixtures', () => {
    expect(scenarioNames).toEqual(['idle', 'medium-load', 'peak']);

    for (const name of scenarioNames) {
      const fixture = loadFixture(name);

      expect(fixture.name).toBe(name);
      expect(fixture.cpu.rawSamples.length).toBeGreaterThan(0);
      expect(fixture.cpu.expectedDtos.length).toBe(
        fixture.cpu.rawSamples.length,
      );
      expect(fixture.cpu.expectedChartRows.length).toBe(
        fixture.cpu.expectedDtos.length,
      );
      expect(fixture.memory.rawSamples.length).toBeGreaterThan(0);
      expect(fixture.memory.expectedDtos.length).toBe(
        fixture.memory.rawSamples.length,
      );
      expect(fixture.memory.expectedChartRows.length).toBe(
        fixture.memory.expectedStampedDtos.length,
      );
      expect(fixture.disk.rawRows.length).toBeGreaterThan(0);
      expect(fixture.disk.expectedDto.mounts.length).toBeGreaterThan(0);
      expect(fixture.disk.expectedChartRows.length).toBe(
        fixture.disk.expectedDto.mounts.length,
      );
    }
  });

  it('throws a clear error for unknown fixture names', () => {
    expect(() => loadFixture('does-not-exist')).toThrow(/does-not-exist/);
  });
});
