import { describe, expect, it } from 'vitest';
import { computeTimeTicks } from './computeTimeTicks';

describe('computeTimeTicks', () => {
  it('returns an empty array for empty input', () => {
    expect(computeTimeTicks([])).toEqual([]);
  });

  it('preserves a single-element input', () => {
    expect(computeTimeTicks([10])).toEqual([10]);
  });

  it('returns the input unchanged when length equals count', () => {
    expect(computeTimeTicks([1, 2, 3, 4, 5], 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns the input unchanged when length is below the default count', () => {
    expect(computeTimeTicks([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('picks five evenly spaced values from nine inputs', () => {
    expect(computeTimeTicks([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([
      1, 3, 5, 7, 9,
    ]);
  });

  it('always includes the first and last values for inputs larger than count', () => {
    const values = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    const result = computeTimeTicks(values, 5);
    expect(result).toHaveLength(5);
    expect(result[0]).toBe(values[0]);
    expect(result[result.length - 1]).toBe(values[values.length - 1]);
  });

  it('does not mutate its input', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const snapshot = [...values];
    computeTimeTicks(values);
    expect(values).toEqual(snapshot);
  });
});
