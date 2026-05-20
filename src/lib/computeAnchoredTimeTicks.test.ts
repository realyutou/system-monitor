import { describe, expect, it } from 'vitest';
import { computeAnchoredTimeTicks } from './computeAnchoredTimeTicks';

describe('computeAnchoredTimeTicks', () => {
  it('returns an empty array when min is not finite', () => {
    expect(computeAnchoredTimeTicks(NaN, 0)).toEqual([]);
    expect(computeAnchoredTimeTicks(Infinity, 0)).toEqual([]);
    expect(computeAnchoredTimeTicks(-Infinity, 0)).toEqual([]);
  });

  it('returns an empty array when max is not finite', () => {
    expect(computeAnchoredTimeTicks(0, NaN)).toEqual([]);
    expect(computeAnchoredTimeTicks(0, Infinity)).toEqual([]);
    expect(computeAnchoredTimeTicks(0, -Infinity)).toEqual([]);
  });

  it('returns an empty array when max is less than min', () => {
    expect(computeAnchoredTimeTicks(100, 50)).toEqual([]);
  });

  it('returns an empty array when the range is narrower than one step', () => {
    expect(computeAnchoredTimeTicks(1_000, 14_000, 15_000)).toEqual([]);
  });

  it('returns one tick when the range covers exactly one step multiple', () => {
    expect(computeAnchoredTimeTicks(10_000, 20_000, 15_000)).toEqual([15_000]);
  });

  it('returns each step multiple in order when the range covers several', () => {
    expect(computeAnchoredTimeTicks(7_000, 64_000, 15_000)).toEqual([
      15_000,
      30_000,
      45_000,
      60_000,
    ]);
  });

  it('includes both endpoints when the range is aligned on step boundaries', () => {
    expect(computeAnchoredTimeTicks(15_000, 60_000, 15_000)).toEqual([
      15_000,
      30_000,
      45_000,
      60_000,
    ]);
  });

  it('defaults step to 15_000 when omitted', () => {
    expect(computeAnchoredTimeTicks(0, 60_000)).toEqual([
      0,
      15_000,
      30_000,
      45_000,
      60_000,
    ]);
  });

  it('does not mutate its numeric inputs', () => {
    let min = 7_000;
    let max = 64_000;
    let step = 15_000;
    const before = { min, max, step };
    computeAnchoredTimeTicks(min, max, step);
    expect(min).toBe(before.min);
    expect(max).toBe(before.max);
    expect(step).toBe(before.step);
  });
});
