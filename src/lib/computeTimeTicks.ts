// Assumes `values` is sorted in ascending order; does not re-sort.
export function computeTimeTicks(values: number[], count = 5): number[] {
  if (values.length === 0) return [];
  if (values.length <= count) return [...values];
  const last = values.length - 1;
  return Array.from({ length: count }, (_, i) =>
    values[Math.round((i * last) / (count - 1))],
  );
}
