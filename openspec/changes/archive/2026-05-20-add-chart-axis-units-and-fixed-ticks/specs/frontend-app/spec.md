## ADDED Requirements

### Requirement: CpuChart Y axis ticks are suffixed with `%`

`<CpuChart />` SHALL render its `<YAxis>` with a `tickFormatter` prop so that every Y-axis tick label visually communicates the percentage unit. The formatter MUST be a pure function that takes a numeric tick value and returns a string ending with ` %` (a single space followed by the percent sign). The Y axis domain MUST remain fixed to `[0, 100]` as required by the existing scenario `CpuChart Y axis is fixed to 0–100`.

#### Scenario: tickFormatter returns a percent-suffixed string

- **WHEN** a reviewer reads `src/components/CpuChart.tsx` and extracts the `tickFormatter` prop passed to `<YAxis>`
- **THEN** calling that formatter with the input `50` MUST return a string whose last two characters are the substring ` %` (space followed by `%`)
- **AND** calling that formatter with the input `0` MUST also return a string whose last two characters are the substring ` %`

#### Scenario: Rendered DOM contains a percent-suffixed Y tick

- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` with a fixture of at least three rows whose `usage` values include both ends of `[0, 100]`
- **THEN** `container.textContent` MUST contain at least one of the substrings `0 %`, `25 %`, `50 %`, `75 %`, `100 %`

### Requirement: MemoryChart Y axis ticks are suffixed with `%`

`<MemoryChart />` SHALL render its `<YAxis>` with a `tickFormatter` prop so that every Y-axis tick label visually communicates the percentage unit. The formatter MUST be a pure function that takes a numeric tick value and returns a string ending with ` %` (a single space followed by the percent sign). The Y axis domain MUST remain fixed to `[0, 100]` as required by the existing scenario `MemoryChart Y axis is fixed to 0–100`.

#### Scenario: tickFormatter returns a percent-suffixed string

- **WHEN** a reviewer reads `src/components/MemoryChart.tsx` and extracts the `tickFormatter` prop passed to `<YAxis>`
- **THEN** calling that formatter with the input `50` MUST return a string whose last two characters are the substring ` %`
- **AND** calling that formatter with the input `0` MUST also return a string whose last two characters are the substring ` %`

#### Scenario: Rendered DOM contains a percent-suffixed Y tick

- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` with a fixture of at least three rows whose `usage` values include both ends of `[0, 100]`
- **THEN** `container.textContent` MUST contain at least one of the substrings `0 %`, `25 %`, `50 %`, `75 %`, `100 %`

### Requirement: DiskChart X axis ticks are suffixed with `%`

`<DiskChart />` SHALL render its numeric `<XAxis>` with a `tickFormatter` prop so that every X-axis tick label visually communicates the percentage unit. The formatter MUST be a pure function that takes a numeric tick value and returns a string ending with ` %` (a single space followed by the percent sign). The X axis domain MUST remain fixed to `[0, 100]` as required by the existing scenario `DiskChart X axis domain is fixed to 0–100`.

#### Scenario: tickFormatter returns a percent-suffixed string

- **WHEN** a reviewer reads `src/components/DiskChart.tsx` and extracts the `tickFormatter` prop passed to `<XAxis>`
- **THEN** calling that formatter with the input `0` MUST return a string whose last two characters are the substring ` %`
- **AND** calling that formatter with the input `100` MUST return a string whose last two characters are the substring ` %`

#### Scenario: Rendered DOM contains a percent-suffixed X tick

- **WHEN** a test renders `<DiskChart data={fixture} width={400} height={200} />` with a fixture of at least one `{ fs, usage }` row
- **THEN** `container.textContent` MUST contain at least one of the substrings `0 %`, `25 %`, `50 %`, `75 %`, `100 %`

### Requirement: CpuChart X axis renders at most 5 evenly spaced timestamp ticks

`<CpuChart />` SHALL pass an explicit `ticks` prop to its `<XAxis>` so that the displayed X-axis tick count does not depend on Recharts' automatic tick computation. The `ticks` array MUST be computed by calling `computeTimeTicks(data.map((row) => row.time), 5)`. The resulting array length MUST equal `Math.min(data.length, 5)`, and when `data.length > 5` the first and last entries MUST equal the first and last `time` values in `data` (so the visible tick range matches the data range).

#### Scenario: Five evenly spaced ticks for a nine-row fixture

- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` where `fixture` has exactly nine rows with strictly increasing `time` values
- **THEN** for each of the row indices `0, 2, 4, 6, 8` the corresponding `formatChartTime(fixture[i].time)` string MUST appear in `container.textContent`
- **AND** for each of the row indices `1, 3, 5, 7` the corresponding `formatChartTime(fixture[i].time)` string MUST NOT appear in `container.textContent`

#### Scenario: All ticks shown when data has fewer than five rows

- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` where `fixture` has exactly three rows
- **THEN** for each row index `0, 1, 2` the corresponding `formatChartTime(fixture[i].time)` string MUST appear in `container.textContent`

### Requirement: MemoryChart X axis renders at most 5 evenly spaced timestamp ticks

`<MemoryChart />` SHALL pass an explicit `ticks` prop to its `<XAxis>` so that the displayed X-axis tick count does not depend on Recharts' automatic tick computation. The `ticks` array MUST be computed by calling `computeTimeTicks(data.map((row) => row.time), 5)`. The resulting array length MUST equal `Math.min(data.length, 5)`, and when `data.length > 5` the first and last entries MUST equal the first and last `time` values in `data`.

#### Scenario: Five evenly spaced ticks for a nine-row fixture

- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` where `fixture` has exactly nine rows with strictly increasing `time` values
- **THEN** for each of the row indices `0, 2, 4, 6, 8` the corresponding `formatChartTime(fixture[i].time)` string MUST appear in `container.textContent`
- **AND** for each of the row indices `1, 3, 5, 7` the corresponding `formatChartTime(fixture[i].time)` string MUST NOT appear in `container.textContent`

#### Scenario: All ticks shown when data has fewer than five rows

- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` where `fixture` has exactly three rows
- **THEN** for each row index `0, 1, 2` the corresponding `formatChartTime(fixture[i].time)` string MUST appear in `container.textContent`

### Requirement: computeTimeTicks utility selects up to N evenly spaced values from a sorted numeric array

The frontend SHALL expose a pure function `computeTimeTicks(values: number[], count?: number): number[]` from `src/lib/computeTimeTicks.ts`. The function SHALL be pure (no `fetch`, no `setTimeout`, no module-scope mutation) so it can be unit-tested without mocking. The default value of `count` SHALL be `5`. The function assumes the input `values` array is sorted in ascending order; it SHALL NOT internally re-sort the array.

Selection rules:
- If `values.length === 0`, the function MUST return an empty array.
- If `values.length <= count`, the function MUST return a new array containing the same elements in the same order as `values`.
- If `values.length > count`, the function MUST return an array of length exactly `count` whose first element equals `values[0]` and whose last element equals `values[values.length - 1]`; the intermediate `count - 2` elements MUST be selected from `values` at evenly spaced indices computed as `Math.round(((i * (values.length - 1)) / (count - 1)))` for `i` in `0..count-1`.

#### Scenario: Empty input yields empty output

- **WHEN** `computeTimeTicks([])` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Single-element input is preserved

- **WHEN** `computeTimeTicks([10])` is called
- **THEN** the return value MUST deep-equal `[10]`

#### Scenario: Input length equal to count is returned unchanged

- **WHEN** `computeTimeTicks([1, 2, 3, 4, 5], 5)` is called
- **THEN** the return value MUST deep-equal `[1, 2, 3, 4, 5]`

#### Scenario: Input length below default count is returned unchanged

- **WHEN** `computeTimeTicks([1, 2, 3])` is called (default `count = 5`)
- **THEN** the return value MUST deep-equal `[1, 2, 3]`

#### Scenario: Nine values produce five evenly spaced picks

- **WHEN** `computeTimeTicks([1, 2, 3, 4, 5, 6, 7, 8, 9])` is called (default `count = 5`)
- **THEN** the return value MUST deep-equal `[1, 3, 5, 7, 9]`

#### Scenario: Endpoints are always included for inputs larger than count

- **WHEN** `computeTimeTicks(values, count)` is called with `values.length > count` and `count >= 2`
- **THEN** the return value's first element MUST equal `values[0]`
- **AND** the return value's last element MUST equal `values[values.length - 1]`
- **AND** the return value's length MUST equal `count`

#### Scenario: Function is pure (does not mutate its input)

- **WHEN** `computeTimeTicks(values)` is called with any `values` array
- **THEN** after the call, the `values` array MUST be deep-equal to the value it held before the call
