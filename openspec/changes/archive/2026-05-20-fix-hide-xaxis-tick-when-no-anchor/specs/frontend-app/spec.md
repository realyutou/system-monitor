## MODIFIED Requirements

### Requirement: CpuChart X axis renders at most 5 evenly spaced timestamp ticks

`<CpuChart />` SHALL pass an explicit `ticks` prop to its `<XAxis>` so that the displayed X-axis tick positions are anchored to wall-clock seconds and do not depend on Recharts' automatic tick computation. The `ticks` array MUST be computed by calling `computeAnchoredTimeTicks(min, max)` where `min` is the `time` value of the first row in `data` and `max` is the `time` value of the last row (when `data.length >= 1`); when `data.length === 0` the chart MUST pass `[]` as `ticks`. The resulting array MAY have between 0 and 5 entries inclusive depending on how many multiples of the anchoring step fall inside `[min, max]`. When the resulting array is empty, `<CpuChart />` MUST additionally pass `tick={false}` to its `<XAxis>` to suppress Recharts' fallback tick rendering; when the resulting array is non-empty, `<CpuChart />` MUST NOT pass `tick={false}`.

#### Scenario: Anchored ticks for a fixture spanning 60 seconds across two 15-second boundaries

- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` where `fixture` covers a range of at least 60 seconds (i.e. `fixture[fixture.length - 1].time - fixture[0].time >= 60_000`) and includes at least three multiples of 15 000 ms within `[fixture[0].time, fixture[fixture.length - 1].time]`
- **THEN** `container.textContent` MUST contain `formatChartTime(t)` for at least three distinct anchored timestamps `t` where each `t` is a multiple of 15 000 ms and falls within the fixture's time range
- **AND** `container.textContent` MUST NOT contain `formatChartTime(fixture[1].time)` when `fixture[1].time` is not a multiple of 15 000 ms
- **AND** the `tick` prop on `<XAxis>` MUST NOT be `false`

#### Scenario: Empty data produces no X ticks

- **WHEN** a test renders `<CpuChart data={[]} width={400} height={200} />`
- **THEN** the chart MUST mount without throwing
- **AND** `container.textContent` MUST NOT contain any `HH:MM:SS` substring matching `/\d{2}:\d{2}:\d{2}/`
- **AND** the `tick` prop on `<XAxis>` MUST be `false`

#### Scenario: Short-span data with no anchored multiple produces no X ticks

- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` where `fixture` covers a range strictly less than 15 000 ms AND no multiple of 15 000 ms falls within `[fixture[0].time, fixture[fixture.length - 1].time]`
- **THEN** `container.textContent` MUST NOT contain any `HH:MM:SS` substring matching `/\d{2}:\d{2}:\d{2}/`
- **AND** the `tick` prop on `<XAxis>` MUST be `false`

### Requirement: MemoryChart X axis renders at most 5 evenly spaced timestamp ticks

`<MemoryChart />` SHALL pass an explicit `ticks` prop to its `<XAxis>` so that the displayed X-axis tick positions are anchored to wall-clock seconds and do not depend on Recharts' automatic tick computation. The `ticks` array MUST be computed by calling `computeAnchoredTimeTicks(min, max)` where `min` is the `time` value of the first row in `data` and `max` is the `time` value of the last row (when `data.length >= 1`); when `data.length === 0` the chart MUST pass `[]` as `ticks`. The resulting array MAY have between 0 and 5 entries inclusive depending on how many multiples of the anchoring step fall inside `[min, max]`. When the resulting array is empty, `<MemoryChart />` MUST additionally pass `tick={false}` to its `<XAxis>` to suppress Recharts' fallback tick rendering; when the resulting array is non-empty, `<MemoryChart />` MUST NOT pass `tick={false}`.

#### Scenario: Anchored ticks for a fixture spanning 60 seconds across two 15-second boundaries

- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` where `fixture` covers a range of at least 60 seconds (i.e. `fixture[fixture.length - 1].time - fixture[0].time >= 60_000`) and includes at least three multiples of 15 000 ms within `[fixture[0].time, fixture[fixture.length - 1].time]`
- **THEN** `container.textContent` MUST contain `formatChartTime(t)` for at least three distinct anchored timestamps `t` where each `t` is a multiple of 15 000 ms and falls within the fixture's time range
- **AND** `container.textContent` MUST NOT contain `formatChartTime(fixture[1].time)` when `fixture[1].time` is not a multiple of 15 000 ms
- **AND** the `tick` prop on `<XAxis>` MUST NOT be `false`

#### Scenario: Empty data produces no X ticks

- **WHEN** a test renders `<MemoryChart data={[]} width={400} height={200} />`
- **THEN** the chart MUST mount without throwing
- **AND** `container.textContent` MUST NOT contain any `HH:MM:SS` substring matching `/\d{2}:\d{2}:\d{2}/`
- **AND** the `tick` prop on `<XAxis>` MUST be `false`

#### Scenario: Short-span data with no anchored multiple produces no X ticks

- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` where `fixture` covers a range strictly less than 15 000 ms AND no multiple of 15 000 ms falls within `[fixture[0].time, fixture[fixture.length - 1].time]`
- **THEN** `container.textContent` MUST NOT contain any `HH:MM:SS` substring matching `/\d{2}:\d{2}:\d{2}/`
- **AND** the `tick` prop on `<XAxis>` MUST be `false`
