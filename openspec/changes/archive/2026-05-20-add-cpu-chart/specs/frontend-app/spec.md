## ADDED Requirements

### Requirement: App fetches /api/metrics/cpu on initial mount and renders a CpuChart

The frontend `<App />` component SHALL, in addition to its existing `/healthz`
fetch, issue exactly one HTTP `GET /api/metrics/cpu` request on initial
mount and SHALL render a `<CpuChart />` component fed by the chart row
series derived from that response. The component MUST NOT crash, suspend,
or throw if either fetch fails; the chart MUST still mount with an empty
data series so the rest of the UI continues to render. The existing
`Backend: ok` text contract from the prior phase MUST be preserved (the
text MUST still appear in the DOM after a successful `/healthz` response).

#### Scenario: Successful CPU fetch renders the chart
- **WHEN** the test environment mounts `<App />` with `global.fetch` stubbed so that `/healthz` resolves to `{ ok: true, status: 200, json: async () => ({ status: 'ok' }) }` and `/api/metrics/cpu` resolves to `{ ok: true, status: 200, json: async () => ({ usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z' }) }`
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="cpu-chart"`
- **AND** the rendered DOM MUST contain a visible text node whose accessible text matches the substring `Backend: ok`
- **AND** `global.fetch` MUST have been called at least once with the URL `/api/metrics/cpu`

#### Scenario: Failed CPU fetch does not crash the component
- **WHEN** the test environment mounts `<App />` with `global.fetch` stubbed so that `/api/metrics/cpu` rejects with `new Error('network')` and `/healthz` resolves successfully
- **THEN** `<App />` MUST NOT throw out of its render
- **AND** the rendered DOM MUST still contain an element identified by `data-testid="cpu-chart"` (the chart container MUST mount even when its series is empty)
- **AND** the rendered DOM MUST still contain a visible text node whose accessible text matches the substring `Backend: ok`

#### Scenario: App calls /api/metrics/cpu exactly once during mount
- **WHEN** the test environment mounts `<App />` with both `/healthz` and `/api/metrics/cpu` stubbed to resolve successfully and the test waits for both effects to settle
- **THEN** the number of `global.fetch` invocations whose URL equals `/api/metrics/cpu` MUST be exactly 1 (the page MUST NOT poll within this phase)

### Requirement: CpuChart component renders a Recharts LineChart from CpuChartRow data

The frontend SHALL expose a `<CpuChart />` component from
`src/components/CpuChart.tsx` that accepts a `data` prop of type
`CpuChartRow[]` and renders a Recharts `<LineChart>` containing an
`<XAxis>` keyed on `time`, a `<YAxis>` whose domain is fixed to `[0, 100]`,
and a `<Line>` keyed on `usage` with point markers enabled. The component
SHALL accept optional `width` and `height` numeric props (test
environments MAY pass small values to keep rendering fast) and SHALL
expose the identifier `data-testid="cpu-chart"` on the chart wrapper so
tests can locate it without depending on Recharts internals. The
component SHALL NOT use Recharts' `<ResponsiveContainer>` (jsdom does
not provide reliable layout metrics for it during testing).

#### Scenario: CpuChart renders an SVG path for non-empty data
- **WHEN** a test renders `<CpuChart data={fixture} width={400} height={200} />` where `fixture` is an array of at least three `{ time, usage }` rows
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="cpu-chart"`
- **AND** the rendered DOM (inside that element) MUST contain at least one `<svg>` element
- **AND** the rendered DOM (inside that element) MUST contain at least one `<path>` element (the Recharts `<Line>` path)

#### Scenario: CpuChart mounts even when data is empty
- **WHEN** a test renders `<CpuChart data={[]} width={400} height={200} />`
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="cpu-chart"`
- **AND** the component MUST NOT throw during render

#### Scenario: CpuChart Y axis is fixed to 0–100
- **WHEN** a reviewer reads `src/components/CpuChart.tsx`
- **THEN** the `<YAxis>` element MUST be passed a `domain` prop whose value is exactly the tuple `[0, 100]`

#### Scenario: CpuChart does not import ResponsiveContainer
- **WHEN** a reviewer reads `src/components/CpuChart.tsx`
- **THEN** the file MUST NOT import the identifier `ResponsiveContainer` from `recharts`

### Requirement: toCpuSeries converts CpuMetricDto array to CpuChartRow array

The frontend SHALL expose a pure function
`toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[]` from
`src/lib/toCpuSeries.ts`. The function SHALL return a new array whose
length equals the input length, preserving input order. For each input
DTO, the corresponding output row's `time` field MUST equal
`Date.parse(dto.timestamp)` and the row's `usage` field MUST equal
`dto.usagePercent`. The function SHALL be pure (no `fetch`, no
`setTimeout`, no module-scope mutation) so it can be unit-tested without
mocking.

The frontend SHALL also export the row type `CpuChartRow` (with
required fields `time: number` and `usage: number`) from
`src/lib/toCpuSeries.ts`.

#### Scenario: Empty input yields empty output
- **WHEN** `toCpuSeries([])` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Single DTO yields single row with mapped fields
- **WHEN** `toCpuSeries([{ usagePercent: 42, cores: 8, timestamp: '2026-05-19T10:00:00Z' }])` is called
- **THEN** the return value MUST be an array of length 1
- **AND** the element at index 0 MUST have `time === Date.parse('2026-05-19T10:00:00Z')`
- **AND** the element at index 0 MUST have `usage === 42`

#### Scenario: Multiple DTOs preserve input order
- **WHEN** `toCpuSeries` is called with three DTOs whose `timestamp` values are `'2026-05-19T10:00:00Z'`, `'2026-05-19T10:00:02Z'`, `'2026-05-19T10:00:04Z'` (in that order)
- **THEN** the return value MUST be an array of length 3
- **AND** the `time` field of the element at index 0 MUST be strictly less than the `time` field at index 1
- **AND** the `time` field of the element at index 1 MUST be strictly less than the `time` field at index 2

### Requirement: useCpu hook encapsulates /api/metrics/cpu fetch and exposes data plus tri-state status

The frontend SHALL expose a `useCpu()` React hook from
`src/hooks/useCpu.ts` which encapsulates the `fetch('/api/metrics/cpu')`
call, manages the request's loading and resolved state internally, and
returns an object with two fields: `data` (whose value is either `null`
before the request resolves, or a `CpuChartRow[]` produced by
`toCpuSeries` after a successful response) and `status` (whose value is
one of the string literals `'loading'`, `'ok'`, or `'error'`). The hook
SHALL invoke `getCpu()` from `src/lib/api.ts` rather than calling
`fetch` directly. The hook SHALL be safe against `setState` after
unmount (it MUST guard against late resolutions writing to a component
that has already been unmounted). The hook SHALL NOT use `setInterval`,
`setTimeout`, or any other recurring scheduling mechanism within this
phase (polling is deferred to a later phase).

#### Scenario: useCpu returns 'loading' and null data before the request resolves
- **WHEN** a component renders `useCpu()` with `global.fetch` mocked to a never-resolving promise
- **THEN** the initial value of the returned `status` MUST be `'loading'`
- **AND** the initial value of the returned `data` MUST be `null`

#### Scenario: useCpu returns 'ok' and a CpuChartRow array after a successful fetch
- **WHEN** a component renders `useCpu()` with `global.fetch` mocked to resolve to `{ ok: true, status: 200, json: async () => ({ usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z' }) }`
- **THEN** the returned `status` MUST eventually become `'ok'`
- **AND** the returned `data` MUST eventually be an array of length 1
- **AND** the element at index 0 of `data` MUST have `time === Date.parse('2026-05-19T10:00:00Z')` and `usage === 7`

#### Scenario: useCpu returns 'error' when the fetch rejects
- **WHEN** a component renders `useCpu()` with `global.fetch` mocked to reject
- **THEN** the returned `status` MUST eventually become `'error'`

#### Scenario: useCpu does not call fetch directly
- **WHEN** a reviewer reads `src/hooks/useCpu.ts`
- **THEN** the file MUST import `getCpu` from `src/lib/api` (or equivalent relative path)
- **AND** the file MUST NOT contain a direct call to `fetch(...)`

#### Scenario: useCpu does not schedule recurring work
- **WHEN** a reviewer reads `src/hooks/useCpu.ts`
- **THEN** the file MUST NOT contain a call to `setInterval`
- **AND** the file MUST NOT contain a call to `setTimeout` (within the effect body)

### Requirement: src/lib/api.ts exposes the CPU endpoint, DTO type, and getCpu helper

The single source of truth at `src/lib/api.ts` SHALL additionally export
(a) a string constant whose value is exactly `'/api/metrics/cpu'`,
(b) a TypeScript type alias `CpuMetricDto` with required numeric fields
`usagePercent` and `cores` and a required string field `timestamp`, and
(c) a zero-argument async function named `getCpu` whose return value is
a `Promise` resolving to a `CpuMetricDto`. The function SHALL throw if
the response is not OK (consistent with the existing `getHealth`
behaviour).

#### Scenario: api.ts exports CPU_ENDPOINT, CpuMetricDto, and getCpu
- **WHEN** a reviewer imports from `src/lib/api.ts`
- **THEN** the module MUST export an identifier whose value is the string `'/api/metrics/cpu'`
- **AND** the module MUST export a TypeScript type alias named `CpuMetricDto`
- **AND** the module MUST export an async function `getCpu` with arity zero
- **AND** calling `getCpu()` (with `global.fetch` mocked to a successful response containing `{ usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z' }`) MUST resolve to an object whose fields `usagePercent`, `cores`, and `timestamp` equal those values

#### Scenario: getCpu throws on non-OK response
- **WHEN** `getCpu()` is called with `global.fetch` mocked to resolve to `{ ok: false, status: 500 }`
- **THEN** the returned promise MUST reject (the function MUST NOT silently return undefined or an empty object)

### Requirement: Recharts is declared as a runtime dependency

The repository's `package.json` SHALL declare `recharts` under
`dependencies` (not `devDependencies`), because the chart code is part
of the shipped frontend bundle. The exact version range is left to the
implementer but SHALL be a published, non-prerelease version of
Recharts v2 or later.

#### Scenario: package.json declares recharts under dependencies
- **WHEN** a reviewer reads `package.json`
- **THEN** the `dependencies` object MUST contain a key `recharts`
- **AND** the `devDependencies` object MUST NOT contain a key `recharts`
