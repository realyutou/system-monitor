import { describe, expect, it } from 'vitest';
import { loadFixture, scenarioNames } from '../fixtures/systemScenarios';
import {
  toCpuMetricDto,
  toDiskMetricDto,
  toMemoryMetricDto,
} from '../../server/metricsRouter.js';

describe('backend metric scenario fixtures', () => {
  describe.each(scenarioNames)('%s', (name) => {
    it('maps CPU raw samples to expected DTOs', () => {
      const fixture = loadFixture(name);
      const dtos = fixture.cpu.rawSamples.map((sample) =>
        toCpuMetricDto(sample.load, sample.timestamp),
      );

      expect(dtos).toEqual(fixture.cpu.expectedDtos);
    });

    it('maps memory raw samples to expected DTOs', () => {
      const fixture = loadFixture(name);
      const dtos = fixture.memory.rawSamples.map((sample) =>
        toMemoryMetricDto(sample.mem),
      );

      expect(dtos).toEqual(fixture.memory.expectedDtos);
    });

    it('maps and filters disk raw rows to the expected DTO', () => {
      const fixture = loadFixture(name);

      expect(toDiskMetricDto(fixture.disk.rawRows)).toEqual(
        fixture.disk.expectedDto,
      );
    });
  });
});
