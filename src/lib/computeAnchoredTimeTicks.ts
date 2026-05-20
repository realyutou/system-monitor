export function computeAnchoredTimeTicks(
  min: number,
  max: number,
  step = 15_000,
): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  const first = Math.ceil(min / step) * step;
  const last = Math.floor(max / step) * step;
  if (last < first) return [];
  const ticks: number[] = [];
  for (let t = first; t <= last; t += step) ticks.push(t);
  return ticks;
}
