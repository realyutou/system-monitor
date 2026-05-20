## MODIFIED Requirements

### Requirement: CpuChart X axis renders at most 5 evenly spaced timestamp ticks

`<CpuChart />` SHALL pass an explicit `ticks` prop to its `<XAxis>` so that the displayed X-axis tick positions are anchored to wall-clock seconds and do not depend on Recharts' automatic tick computation. The `ticks` array MUST be computed by calling `computeAnchoredTimeTicks(min, max)` where `min` is the `time` value of the first row in `data` and `max` is the `time` value of the last row (when `data.length >= 1`); when `data.length === 0` the chart MUST pass `[]` as `ticks`. The resulting array MAY have between 0 and 5 entries inclusive depending on how many multiples of the anchoring step fall inside `[min, max]`.

#### Scenario: Anchored ticks for a fixture spanning 60 seconds across two 15-second boundaries

- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` where `fixture` covers a range of at least 60 seconds (i.e. `fixture[fixture.length - 1].time - fixture[0].time >= 60_000`) and includes at least three multiples of 15 000 ms within `[fixture[0].time, fixture[fixture.length - 1].time]`
- **THEN** `container.textContent` MUST contain `formatChartTime(t)` for at least three distinct anchored timestamps `t` where each `t` is a multiple of 15 000 ms and falls within the fixture's time range
- **AND** `container.textContent` MUST NOT contain `formatChartTime(fixture[1].time)` when `fixture[1].time` is not a multiple of 15 000 ms

#### Scenario: Empty data produces no X ticks

- **WHEN** a test renders `<CpuChart data={[]} width={400} height={200} />`
- **THEN** the chart MUST mount without throwing
- **AND** `container.textContent` MUST NOT contain any `HH:MM:SS` substring matching `/\d{2}:\d{2}:\d{2}/`

### Requirement: MemoryChart X axis renders at most 5 evenly spaced timestamp ticks

`<MemoryChart />` SHALL pass an explicit `ticks` prop to its `<XAxis>` so that the displayed X-axis tick positions are anchored to wall-clock seconds and do not depend on Recharts' automatic tick computation. The `ticks` array MUST be computed by calling `computeAnchoredTimeTicks(min, max)` where `min` is the `time` value of the first row in `data` and `max` is the `time` value of the last row (when `data.length >= 1`); when `data.length === 0` the chart MUST pass `[]` as `ticks`. The resulting array MAY have between 0 and 5 entries inclusive depending on how many multiples of the anchoring step fall inside `[min, max]`.

#### Scenario: Anchored ticks for a fixture spanning 60 seconds across two 15-second boundaries

- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` where `fixture` covers a range of at least 60 seconds (i.e. `fixture[fixture.length - 1].time - fixture[0].time >= 60_000`) and includes at least three multiples of 15 000 ms within `[fixture[0].time, fixture[fixture.length - 1].time]`
- **THEN** `container.textContent` MUST contain `formatChartTime(t)` for at least three distinct anchored timestamps `t` where each `t` is a multiple of 15 000 ms and falls within the fixture's time range
- **AND** `container.textContent` MUST NOT contain `formatChartTime(fixture[1].time)` when `fixture[1].time` is not a multiple of 15 000 ms

#### Scenario: Empty data produces no X ticks

- **WHEN** a test renders `<MemoryChart data={[]} width={400} height={200} />`
- **THEN** the chart MUST mount without throwing
- **AND** `container.textContent` MUST NOT contain any `HH:MM:SS` substring matching `/\d{2}:\d{2}:\d{2}/`

## REMOVED Requirements

### Requirement: computeTimeTicks utility selects up to N evenly spaced values from a sorted numeric array

**Reason**: Replaced by `computeAnchoredTimeTicks` (see ADDED Requirements below). The data-driven approach where ticks are selected from the input `values` array produces visually unstable axes that re-label on every 2-second poll. The new utility anchors ticks to wall-clock multiples of a configurable step (default 15 000 ms), so tick labels remain stable across polls except when crossing an anchor boundary.

**Migration**: `src/lib/computeTimeTicks.ts` and `src/lib/computeTimeTicks.test.ts` are deleted. Callers `<CpuChart />` and `<MemoryChart />` migrate to `computeAnchoredTimeTicks(min, max)` where `min`/`max` are the first/last `time` values from `data`.

## ADDED Requirements

### Requirement: computeAnchoredTimeTicks utility selects multiples of a step within a numeric range

The frontend SHALL expose a pure function `computeAnchoredTimeTicks(min: number, max: number, step?: number): number[]` from `src/lib/computeAnchoredTimeTicks.ts`. The function SHALL be pure (no `fetch`, no `setTimeout`, no module-scope mutation) so it can be unit-tested without mocking. The default value of `step` SHALL be `15_000` (representing 15 seconds when the inputs are millisecond timestamps).

Selection rules:
- If `min` or `max` is not a finite number, or `max < min`, the function MUST return an empty array.
- Otherwise, let `first = Math.ceil(min / step) * step` and `last = Math.floor(max / step) * step`. If `last < first`, the function MUST return an empty array.
- Otherwise, the function MUST return an array containing each multiple of `step` in the closed interval `[first, last]`, listed in ascending order with stride `step`.

#### Scenario: Non-finite inputs yield empty output

- **WHEN** `computeAnchoredTimeTicks(NaN, 0)`, `computeAnchoredTimeTicks(0, NaN)`, or `computeAnchoredTimeTicks(Infinity, 0)` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Inverted range yields empty output

- **WHEN** `computeAnchoredTimeTicks(100, 50)` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Range narrower than one step yields empty output

- **WHEN** `computeAnchoredTimeTicks(1_000, 14_000, 15_000)` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Range covering exactly one multiple yields one tick

- **WHEN** `computeAnchoredTimeTicks(10_000, 20_000, 15_000)` is called
- **THEN** the return value MUST deep-equal `[15_000]`

#### Scenario: Range covering multiple step multiples returns each one in order

- **WHEN** `computeAnchoredTimeTicks(7_000, 64_000, 15_000)` is called
- **THEN** the return value MUST deep-equal `[15_000, 30_000, 45_000, 60_000]`

#### Scenario: Range aligned exactly on step boundaries includes both endpoints

- **WHEN** `computeAnchoredTimeTicks(15_000, 60_000, 15_000)` is called
- **THEN** the return value MUST deep-equal `[15_000, 30_000, 45_000, 60_000]`

#### Scenario: Default step is 15_000

- **WHEN** `computeAnchoredTimeTicks(0, 60_000)` is called without passing `step`
- **THEN** the return value MUST deep-equal `[0, 15_000, 30_000, 45_000, 60_000]`

#### Scenario: Function is pure (does not mutate inputs)

- **WHEN** `computeAnchoredTimeTicks(min, max, step)` is called with any finite arguments
- **THEN** after the call, the caller's local variables `min`, `max`, `step` MUST hold the same numeric values they held before the call

### Requirement: CpuChart wraps its LineChart in a margin that prevents axis-label clipping

`<CpuChart />` SHALL pass a `margin` prop to its `<LineChart>` whose `right` entry is at least `16` pixels and whose `left` entry is at least `4` pixels, so that the leftmost Y-axis tick (`0 %`) does not visually collide with the first X-axis tick and the rightmost X-axis tick (`HH:MM:SS`) is not clipped by the SVG viewport.

#### Scenario: LineChart margin.right is at least 16

- **WHEN** a reviewer reads `src/components/CpuChart.tsx` and extracts the `margin` prop passed to `<LineChart>`
- **THEN** the prop value MUST be an object whose `right` property is a number greater than or equal to `16`
- **AND** the prop value's `left` property MUST be a number greater than or equal to `4`

### Requirement: MemoryChart wraps its LineChart in a margin that prevents axis-label clipping

`<MemoryChart />` SHALL pass a `margin` prop to its `<LineChart>` whose `right` entry is at least `16` pixels and whose `left` entry is at least `4` pixels, so that the leftmost Y-axis tick (`0 %`) does not visually collide with the first X-axis tick and the rightmost X-axis tick (`HH:MM:SS`) is not clipped by the SVG viewport.

#### Scenario: LineChart margin.right is at least 16

- **WHEN** a reviewer reads `src/components/MemoryChart.tsx` and extracts the `margin` prop passed to `<LineChart>`
- **THEN** the prop value MUST be an object whose `right` property is a number greater than or equal to `16`
- **AND** the prop value's `left` property MUST be a number greater than or equal to `4`

### Requirement: DiskChart wraps its BarChart in a margin that prevents axis-label clipping

`<DiskChart />` SHALL pass a `margin` prop to its `<BarChart>` whose `right` entry is at least `16` pixels, so that the rightmost X-axis tick (`100 %`) is not clipped by the SVG viewport.

#### Scenario: BarChart margin.right is at least 16

- **WHEN** a reviewer reads `src/components/DiskChart.tsx` and extracts the `margin` prop passed to `<BarChart>`
- **THEN** the prop value MUST be an object whose `right` property is a number greater than or equal to `16`

### Requirement: CpuChart XAxis padding separates the first data point from the Y axis

`<CpuChart />` SHALL pass a `padding` prop to its `<XAxis>` whose `left` entry is at least `8` pixels, so that the leftmost data point and its associated X-axis tick label do not visually overlap with the Y-axis labels.

#### Scenario: XAxis padding.left is at least 8

- **WHEN** a reviewer reads `src/components/CpuChart.tsx` and extracts the `padding` prop passed to `<XAxis>`
- **THEN** the prop value MUST be an object whose `left` property is a number greater than or equal to `8`

### Requirement: MemoryChart XAxis padding separates the first data point from the Y axis

`<MemoryChart />` SHALL pass a `padding` prop to its `<XAxis>` whose `left` entry is at least `8` pixels, so that the leftmost data point and its associated X-axis tick label do not visually overlap with the Y-axis labels.

#### Scenario: XAxis padding.left is at least 8

- **WHEN** a reviewer reads `src/components/MemoryChart.tsx` and extracts the `padding` prop passed to `<XAxis>`
- **THEN** the prop value MUST be an object whose `left` property is a number greater than or equal to `8`
