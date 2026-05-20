## ADDED Requirements

### Requirement: useMetricPolling hook polls a fetcher on an interval and exposes a transformed history

The frontend SHALL expose a generic React hook `useMetricPolling<TDto, TRow>(fetcher, transform, intervalMs?, historyLimit?)` from `src/hooks/useMetricPolling.ts` with the following contract:

- `fetcher` is a zero-argument async function returning a `Promise<TDto>`.
- `transform` is a synchronous pure function `(dtos: TDto[]) => TRow[]`.
- `intervalMs` is a positive number; when omitted it MUST default to the value of `POLL_INTERVAL_MS` exported by `src/config.ts`.
- `historyLimit` is a positive integer; when omitted it MUST default to the value of `METRIC_HISTORY_LIMIT` exported by `src/config.ts`.
- The hook SHALL invoke `fetcher` once immediately on mount and then once per `intervalMs` while the component remains mounted.
- The hook SHALL maintain an internal history buffer of the most recent fetched DTOs, capped at `historyLimit`; on overflow the oldest entry MUST be discarded so the buffer length never exceeds `historyLimit`.
- The hook SHALL return an object `{ data, status, lastUpdatedAt }` where `status` is one of the string literals `'loading'`, `'ok'`, or `'error'`, `data` is either `null` (while the history is empty) or the result of calling `transform(history)`, and `lastUpdatedAt` is either `null` (before the first successful fetch) or the epoch-millisecond timestamp (via `Date.now()`) of the most recent successful fetch.
- On unmount, the hook MUST clear any pending interval and MUST NOT call `setState` after the component has been unmounted (no setState-after-unmount warnings).
- The hook MUST NOT rebuild its interval when the caller passes a new `fetcher` or `transform` reference on every render; the only deps that cause interval rebuild are `intervalMs` and `historyLimit`.
- A failed fetch MUST NOT advance `lastUpdatedAt`; only the success branch of the polling tick may update it.

#### Scenario: useMetricPolling fetches once on mount
- **WHEN** a component renders `useMetricPolling(fetcher, transform, 2000)` with `fetcher` returning `Promise.resolve({ x: 1 })`
- **THEN** `fetcher` MUST be invoked at least once before the first interval elapses
- **AND** within an asynchronous tick (`await vi.advanceTimersByTimeAsync(0)`), the returned `status` MUST become `'ok'`

#### Scenario: useMetricPolling fetches once per intervalMs
- **WHEN** a component renders `useMetricPolling(fetcher, transform, 2000)` with `vi.useFakeTimers()` active and `fetcher` returning a resolved promise
- **AND** the test advances time via `vi.advanceTimersByTimeAsync(2000)` exactly N times after mount
- **THEN** the total number of `fetcher` invocations MUST be at least `N + 1`

#### Scenario: useMetricPolling caps history at historyLimit
- **WHEN** a component renders `useMetricPolling(fetcher, transform, 100, 3)` and the test advances time enough to trigger ≥ 5 ticks
- **AND** `transform` is the identity function `(dtos) => dtos`
- **THEN** the returned `data` MUST be an array whose length is at most `3`
- **AND** the elements of `data` MUST be the most recent `3` DTOs returned by `fetcher` (oldest discarded)

#### Scenario: useMetricPolling returns 'error' when fetcher rejects
- **WHEN** a component renders `useMetricPolling(fetcher, transform, 2000)` with `fetcher` rejecting
- **THEN** the returned `status` MUST eventually become `'error'`
- **AND** the returned `data` MUST remain `null` (the history MUST NOT include rejected results)

#### Scenario: useMetricPolling clears interval on unmount
- **WHEN** a component that uses `useMetricPolling` is unmounted after at least one successful tick
- **AND** the test advances time by several more intervals
- **THEN** the total number of `fetcher` invocations after unmount MUST equal the count observed at unmount time (no further fetches)

#### Scenario: useMetricPolling exposes lastUpdatedAt that becomes a number after a successful fetch
- **WHEN** a component renders `useMetricPolling(fetcher, transform, 2000)` with `fetcher` returning `Promise.resolve({ x: 1 })`
- **THEN** the initial value of the returned `lastUpdatedAt` MUST be `null`
- **AND** after `await vi.advanceTimersByTimeAsync(0)`, the returned `lastUpdatedAt` MUST be a finite `number`

#### Scenario: useMetricPolling advances lastUpdatedAt on each successful poll
- **WHEN** a component renders `useMetricPolling(fetcher, transform, 100)` with `fetcher` resolving, and the test reads `lastUpdatedAt` after the initial tick is flushed
- **AND** the test advances time via `await vi.advanceTimersByTimeAsync(100)` and reads `lastUpdatedAt` again
- **THEN** the second value MUST be a `number` greater than or equal to the first

#### Scenario: useMetricPolling does not rebuild interval on unrelated re-renders
- **WHEN** a parent component re-renders the child that uses `useMetricPolling`, passing a new inline `fetcher` reference each render
- **AND** the test advances time by `intervalMs` between re-renders and measures `fetcher` call counts
- **THEN** the `fetcher` call count MUST increase by exactly one per `intervalMs` (not by N per re-render)

### Requirement: src/config.ts exposes POLL_INTERVAL_MS and METRIC_HISTORY_LIMIT with env override and safe fallback

The frontend SHALL declare numeric configuration in `src/config.ts`. At minimum the module SHALL export two named numeric constants:

- `POLL_INTERVAL_MS`: the default polling interval in milliseconds. The exported value MUST be derived from `import.meta.env.VITE_POLL_INTERVAL_MS` when that value is present, finite, and `> 0`; otherwise it MUST fall back to `2000`.
- `METRIC_HISTORY_LIMIT`: the default ring-buffer size for polled history. The exported value MUST be derived from `import.meta.env.VITE_METRIC_HISTORY_LIMIT` when present, finite, and `> 0`; otherwise it MUST fall back to `30`.

The parsing routine SHALL treat unset, empty-string, non-numeric, zero, and negative values as "use fallback" rather than throwing.

#### Scenario: POLL_INTERVAL_MS defaults to 2000 when env is unset
- **WHEN** `import.meta.env.VITE_POLL_INTERVAL_MS` is `undefined`
- **THEN** the value exported as `POLL_INTERVAL_MS` MUST equal `2000`

#### Scenario: METRIC_HISTORY_LIMIT defaults to 30 when env is unset
- **WHEN** `import.meta.env.VITE_METRIC_HISTORY_LIMIT` is `undefined`
- **THEN** the value exported as `METRIC_HISTORY_LIMIT` MUST equal `30`

#### Scenario: Numeric env value overrides default
- **WHEN** the parsing helper in `src/config.ts` is called with the string `'500'` and the fallback `2000`
- **THEN** the returned value MUST equal `500`

#### Scenario: Invalid env value falls back to default
- **WHEN** the parsing helper in `src/config.ts` is called with the string `'not-a-number'` and the fallback `2000`
- **THEN** the returned value MUST equal `2000`
- **AND** when called with the string `''` and the fallback `30`, the returned value MUST equal `30`
- **AND** when called with the string `'-5'` and the fallback `30`, the returned value MUST equal `30`

### Requirement: src/lib/api.ts exposes the Memory and Disk endpoints, DTO types, and helpers

The single source of truth at `src/lib/api.ts` SHALL additionally export:

- A string constant whose value is exactly `'/api/metrics/memory'`.
- A TypeScript type alias `MemoryMetricDto` with required numeric fields `usedBytes`, `totalBytes`, and `usagePercent`.
- A zero-argument async function `getMemory(): Promise<MemoryMetricDto>` that SHALL throw if the response is not OK.
- A string constant whose value is exactly `'/api/metrics/disk'`.
- A TypeScript type alias `DiskMetricDto` whose `mounts` field is an array of `{ fs: string; usedBytes: number; totalBytes: number; usagePercent: number }`.
- A zero-argument async function `getDisk(): Promise<DiskMetricDto>` that SHALL throw if the response is not OK.

#### Scenario: api.ts exports MEMORY_ENDPOINT, MemoryMetricDto, and getMemory
- **WHEN** a reviewer imports from `src/lib/api.ts`
- **THEN** the module MUST export an identifier whose value is the string `'/api/metrics/memory'`
- **AND** the module MUST export a TypeScript type alias named `MemoryMetricDto`
- **AND** the module MUST export an async function `getMemory` with arity zero
- **AND** calling `getMemory()` (with `global.fetch` mocked to a successful response containing `{ usedBytes: 1, totalBytes: 2, usagePercent: 50 }`) MUST resolve to an object whose fields `usedBytes`, `totalBytes`, and `usagePercent` equal those values

#### Scenario: api.ts exports DISK_ENDPOINT, DiskMetricDto, and getDisk
- **WHEN** a reviewer imports from `src/lib/api.ts`
- **THEN** the module MUST export an identifier whose value is the string `'/api/metrics/disk'`
- **AND** the module MUST export a TypeScript type alias named `DiskMetricDto`
- **AND** the module MUST export an async function `getDisk` with arity zero
- **AND** calling `getDisk()` (with `global.fetch` mocked to a successful response containing `{ mounts: [{ fs: '/', usedBytes: 1, totalBytes: 2, usagePercent: 50 }] }`) MUST resolve to an object whose `mounts` field is an array of length 1 with the expected shape

#### Scenario: getMemory and getDisk throw on non-OK response
- **WHEN** `getMemory()` is called with `global.fetch` mocked to resolve to `{ ok: false, status: 500 }`
- **THEN** the returned promise MUST reject
- **AND** the same SHALL hold for `getDisk()` under an identical mock

### Requirement: toMemorySeries converts stamped memory DTOs to MemoryChartRow array

The frontend SHALL expose a pure function `toMemorySeries(dtos: Array<MemoryMetricDto & { timestamp: string }>): MemoryChartRow[]` from `src/lib/toMemorySeries.ts`. The function SHALL preserve input order and produce one row per input. For each input DTO, the corresponding output row's `time` field MUST equal `Date.parse(dto.timestamp)` and the `usage` field MUST equal `dto.usagePercent`. The function SHALL be pure (no `fetch`, no `setTimeout`, no module-scope mutation).

The frontend SHALL also export the row type `MemoryChartRow` (with required fields `time: number` and `usage: number`) from `src/lib/toMemorySeries.ts`.

#### Scenario: Empty input yields empty output
- **WHEN** `toMemorySeries([])` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Single stamped DTO yields single row with mapped fields
- **WHEN** `toMemorySeries([{ usedBytes: 1, totalBytes: 2, usagePercent: 50, timestamp: '2026-05-20T10:00:00Z' }])` is called
- **THEN** the return value MUST be an array of length 1
- **AND** the element at index 0 MUST have `time === Date.parse('2026-05-20T10:00:00Z')`
- **AND** the element at index 0 MUST have `usage === 50`

#### Scenario: Multiple stamped DTOs preserve input order
- **WHEN** `toMemorySeries` is called with three stamped DTOs whose `timestamp` values are `'2026-05-20T10:00:00Z'`, `'2026-05-20T10:00:02Z'`, `'2026-05-20T10:00:04Z'` (in that order)
- **THEN** the return value MUST be an array of length 3
- **AND** the `time` field of the element at index 0 MUST be strictly less than the `time` field at index 1
- **AND** the `time` field of the element at index 1 MUST be strictly less than the `time` field at index 2

### Requirement: toDiskSnapshot converts DiskMetricDto array to DiskMountBar array using the latest entry

The frontend SHALL expose a pure function `toDiskSnapshot(dtos: DiskMetricDto[]): DiskMountBar[]` from `src/lib/toDiskSnapshot.ts`. The function SHALL return rows derived ONLY from the LAST element of the input array (the most recent snapshot); earlier elements MUST be ignored. For each `mount` in the latest DTO's `mounts` array, the output row's `fs` field MUST equal `mount.fs` and the `usage` field MUST equal `mount.usagePercent`. The function MUST return an empty array when the input is empty. The function SHALL be pure (no `fetch`, no `setTimeout`, no module-scope mutation).

The frontend SHALL also export the row type `DiskMountBar` (with required fields `fs: string` and `usage: number`) from `src/lib/toDiskSnapshot.ts`.

#### Scenario: Empty input yields empty output
- **WHEN** `toDiskSnapshot([])` is called
- **THEN** the return value MUST be an array of length 0

#### Scenario: Single DTO with N mounts yields N rows
- **WHEN** `toDiskSnapshot([{ mounts: [ { fs: '/', usedBytes: 1, totalBytes: 2, usagePercent: 50 }, { fs: '/data', usedBytes: 3, totalBytes: 4, usagePercent: 75 } ] }])` is called
- **THEN** the return value MUST be an array of length 2
- **AND** the element at index 0 MUST have `fs === '/'` and `usage === 50`
- **AND** the element at index 1 MUST have `fs === '/data'` and `usage === 75`

#### Scenario: Multiple DTOs only use the last one
- **WHEN** `toDiskSnapshot` is called with two DTOs, the first having `mounts: [{ fs: '/', usagePercent: 10, usedBytes: 1, totalBytes: 10 }]` and the second having `mounts: [{ fs: '/data', usagePercent: 90, usedBytes: 9, totalBytes: 10 }]`
- **THEN** the return value MUST be an array of length 1
- **AND** the element at index 0 MUST have `fs === '/data'` and `usage === 90` (the earlier DTO MUST NOT contribute any row)

### Requirement: useMemory hook polls /api/metrics/memory and exposes MemoryChartRow series

The frontend SHALL expose a `useMemory()` React hook from `src/hooks/useMemory.ts` which uses `useMetricPolling` under the hood, supplying (a) a fetcher that calls `getMemory()` and attaches a client-side `timestamp: new Date().toISOString()` to the returned DTO, and (b) `toMemorySeries` as the transform. The hook SHALL return an object with two fields: `data` (either `null` before the first response, or a `MemoryChartRow[]` after) and `status` (one of `'loading'`, `'ok'`, `'error'`).

#### Scenario: useMemory returns 'loading' and null data before the request resolves
- **WHEN** a component renders `useMemory()` with `global.fetch` mocked to a never-resolving promise
- **THEN** the initial value of the returned `status` MUST be `'loading'`
- **AND** the initial value of the returned `data` MUST be `null`

#### Scenario: useMemory returns 'ok' and a MemoryChartRow array after a successful fetch
- **WHEN** a component renders `useMemory()` with `global.fetch` mocked to resolve to `{ ok: true, status: 200, json: async () => ({ usedBytes: 1, totalBytes: 2, usagePercent: 50 }) }`
- **THEN** the returned `status` MUST eventually become `'ok'`
- **AND** the returned `data` MUST eventually be an array of length 1
- **AND** the element at index 0 of `data` MUST have `usage === 50` and a numeric `time` value (the client-side timestamp parsed via `Date.parse`)

#### Scenario: useMemory delegates to api helpers and the polling hook
- **WHEN** a reviewer reads `src/hooks/useMemory.ts`
- **THEN** the file MUST import `getMemory` from `src/lib/api` (or equivalent relative path)
- **AND** the file MUST import `toMemorySeries` from `src/lib/toMemorySeries` (or equivalent relative path)
- **AND** the file MUST import `useMetricPolling` from `./useMetricPolling` (or equivalent relative path)
- **AND** the file MUST NOT contain a direct call to `fetch(...)` or `setInterval(...)`

### Requirement: useDisk hook polls /api/metrics/disk and exposes DiskMountBar snapshot

The frontend SHALL expose a `useDisk()` React hook from `src/hooks/useDisk.ts` which uses `useMetricPolling` under the hood, supplying `getDisk` as the fetcher and `toDiskSnapshot` as the transform. The hook SHALL return an object with two fields: `data` (either `null` before the first response, or a `DiskMountBar[]` after) and `status` (one of `'loading'`, `'ok'`, `'error'`).

#### Scenario: useDisk returns 'loading' and null data before the request resolves
- **WHEN** a component renders `useDisk()` with `global.fetch` mocked to a never-resolving promise
- **THEN** the initial value of the returned `status` MUST be `'loading'`
- **AND** the initial value of the returned `data` MUST be `null`

#### Scenario: useDisk returns 'ok' and a DiskMountBar array after a successful fetch
- **WHEN** a component renders `useDisk()` with `global.fetch` mocked to resolve to `{ ok: true, status: 200, json: async () => ({ mounts: [{ fs: '/', usedBytes: 1, totalBytes: 2, usagePercent: 50 }] }) }`
- **THEN** the returned `status` MUST eventually become `'ok'`
- **AND** the returned `data` MUST eventually be an array of length 1
- **AND** the element at index 0 of `data` MUST have `fs === '/'` and `usage === 50`

#### Scenario: useDisk delegates to api helpers and the polling hook
- **WHEN** a reviewer reads `src/hooks/useDisk.ts`
- **THEN** the file MUST import `getDisk` from `src/lib/api` (or equivalent relative path)
- **AND** the file MUST import `toDiskSnapshot` from `src/lib/toDiskSnapshot` (or equivalent relative path)
- **AND** the file MUST import `useMetricPolling` from `./useMetricPolling` (or equivalent relative path)
- **AND** the file MUST NOT contain a direct call to `fetch(...)` or `setInterval(...)`

### Requirement: MemoryChart component renders a Recharts LineChart from MemoryChartRow data

The frontend SHALL expose a `<MemoryChart />` component from `src/components/MemoryChart.tsx` that accepts a `data` prop of type `MemoryChartRow[]` and renders a Recharts `<LineChart>` containing an `<XAxis>` keyed on `time`, a `<YAxis>` whose domain is fixed to `[0, 100]`, and a `<Line>` keyed on `usage` with point markers enabled. The component SHALL accept optional `width` and `height` numeric props and SHALL expose the identifier `data-testid="memory-chart"` on the chart wrapper. The component SHALL NOT use Recharts' `<ResponsiveContainer>`.

#### Scenario: MemoryChart renders an SVG path for non-empty data
- **WHEN** a test renders `<MemoryChart data={fixture} width={400} height={200} />` where `fixture` is an array of at least three `{ time, usage }` rows
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="memory-chart"`
- **AND** the rendered DOM (inside that element) MUST contain at least one `<svg>` element
- **AND** the rendered DOM (inside that element) MUST contain at least one `<path>` element

#### Scenario: MemoryChart mounts even when data is empty
- **WHEN** a test renders `<MemoryChart data={[]} width={400} height={200} />`
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="memory-chart"`
- **AND** the component MUST NOT throw during render

#### Scenario: MemoryChart Y axis is fixed to 0–100
- **WHEN** a reviewer reads `src/components/MemoryChart.tsx`
- **THEN** the `<YAxis>` element MUST be passed a `domain` prop whose value is exactly the tuple `[0, 100]`

#### Scenario: MemoryChart does not import ResponsiveContainer
- **WHEN** a reviewer reads `src/components/MemoryChart.tsx`
- **THEN** the file MUST NOT import the identifier `ResponsiveContainer` from `recharts`

### Requirement: DiskChart component renders a Recharts BarChart from DiskMountBar data

The frontend SHALL expose a `<DiskChart />` component from `src/components/DiskChart.tsx` that accepts a `data` prop of type `DiskMountBar[]` and renders a Recharts `<BarChart>` with `layout="vertical"`, a numeric `<XAxis>` whose domain is fixed to `[0, 100]`, a category `<YAxis>` keyed on `fs`, and a `<Bar>` keyed on `usage`. The component SHALL accept optional `width` and `height` numeric props and SHALL expose the identifier `data-testid="disk-chart"` on the chart wrapper. The component SHALL NOT use Recharts' `<ResponsiveContainer>`.

#### Scenario: DiskChart renders one bar per mount
- **WHEN** a test renders `<DiskChart data={fixture} width={400} height={200} />` where `fixture` is an array of two `{ fs, usage }` rows
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="disk-chart"`
- **AND** the rendered DOM (inside that element) MUST contain at least one `<svg>` element

#### Scenario: DiskChart mounts even when data is empty
- **WHEN** a test renders `<DiskChart data={[]} width={400} height={200} />`
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="disk-chart"`
- **AND** the component MUST NOT throw during render

#### Scenario: DiskChart X axis domain is fixed to 0–100
- **WHEN** a reviewer reads `src/components/DiskChart.tsx`
- **THEN** the `<XAxis>` element MUST be passed a `domain` prop whose value is exactly the tuple `[0, 100]`

#### Scenario: DiskChart does not import ResponsiveContainer
- **WHEN** a reviewer reads `src/components/DiskChart.tsx`
- **THEN** the file MUST NOT import the identifier `ResponsiveContainer` from `recharts`

### Requirement: Dashboard container renders all three charts and surfaces per-metric error notices

The frontend SHALL expose a `<Dashboard />` component from `src/components/Dashboard.tsx` that, on each render, calls `useCpu()`, `useMemory()`, and `useDisk()` internally and renders `<CpuChart>`, `<MemoryChart>`, and `<DiskChart>` (in that order) supplied with the corresponding hooks' `data ?? []`. The component SHALL expose the identifier `data-testid="dashboard"` on its wrapper element. When any hook's `status` equals `'error'`, the Dashboard MUST render a visible notice text identifying the failing metric (e.g., containing the substring `CPU`, `Memory`, or `Disk` together with a failure indicator). The Dashboard MUST NOT crash if any individual hook is in `'loading'` or `'error'` status; the corresponding chart MUST still mount (with empty data series for line charts and bar charts).

When the disk hook's `lastUpdatedAt` is non-null, the Dashboard SHALL render a visible text node near the `<DiskChart>` whose accessible text begins with the substring `Last updated` (e.g., `Last updated: 09:21:37`). This text gives a polling-liveness signal for the disk snapshot, which otherwise rarely changes shape between ticks. The text MUST update at least once per successful disk poll. CPU and Memory charts are NOT required to render an analogous text because their line plots already signal polling visually by appending a new dot per tick.

#### Scenario: Dashboard mounts all three chart testids on successful initial fetch
- **WHEN** a test mounts `<Dashboard />` with `global.fetch` stubbed so that `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk` all resolve successfully (with shape-conforming payloads) and waits for effects to settle
- **THEN** the rendered DOM MUST contain elements identified by `data-testid="dashboard"`, `data-testid="cpu-chart"`, `data-testid="memory-chart"`, and `data-testid="disk-chart"`

#### Scenario: Dashboard renders an error notice when a metric fetch fails
- **WHEN** a test mounts `<Dashboard />` with `global.fetch` stubbed so that `/api/metrics/cpu` resolves successfully but `/api/metrics/memory` rejects
- **THEN** the rendered DOM MUST contain a visible text node whose accessible text contains the substring `Memory` and indicates failure (e.g., the substring `unavailable`)
- **AND** the rendered DOM MUST still contain elements identified by `data-testid="cpu-chart"`, `data-testid="memory-chart"`, and `data-testid="disk-chart"`

#### Scenario: Dashboard renders a last-updated timestamp near the disk chart
- **WHEN** a test mounts `<Dashboard />` with `global.fetch` stubbed so that `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk` all resolve successfully (with shape-conforming payloads)
- **THEN** after `useDisk()`'s first successful tick has flushed, the rendered DOM MUST contain a visible text node whose accessible text contains the substring `Last updated`

#### Scenario: Dashboard delegates to the three wrapper hooks
- **WHEN** a reviewer reads `src/components/Dashboard.tsx`
- **THEN** the file MUST import `useCpu` from `../hooks/useCpu` (or equivalent relative path)
- **AND** the file MUST import `useMemory` from `../hooks/useMemory` (or equivalent relative path)
- **AND** the file MUST import `useDisk` from `../hooks/useDisk` (or equivalent relative path)
- **AND** the file MUST NOT contain a direct call to `fetch(...)`

## MODIFIED Requirements

### Requirement: App fetches /api/metrics/cpu on initial mount and renders a CpuChart

The frontend `<App />` component SHALL, in addition to its existing `/healthz`
fetch, cause at least one HTTP `GET /api/metrics/cpu` request to be issued
on initial mount and SHALL render a `<CpuChart />` component fed by the
chart row series derived from those responses. The fetches MAY be initiated
indirectly through a child container (e.g., `<Dashboard />`) and the
component MUST poll `/api/metrics/cpu` at the configured interval
(`POLL_INTERVAL_MS`) for as long as it remains mounted. The component MUST
NOT crash, suspend, or throw if any fetch fails; the chart MUST still
mount with an empty data series so the rest of the UI continues to render.
The existing `Backend: ok` text contract from the prior phase MUST be
preserved (the text MUST still appear in the DOM after a successful
`/healthz` response).

#### Scenario: Successful CPU fetch renders the chart
- **WHEN** the test environment mounts `<App />` with `global.fetch` stubbed so that `/healthz` resolves to `{ ok: true, status: 200, json: async () => ({ status: 'ok' }) }` and `/api/metrics/cpu` resolves to `{ ok: true, status: 200, json: async () => ({ usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z' }) }` (memory and disk endpoints also resolve to shape-conforming payloads)
- **THEN** the rendered DOM MUST contain an element identified by `data-testid="cpu-chart"`
- **AND** the rendered DOM MUST contain a visible text node whose accessible text matches the substring `Backend: ok`
- **AND** `global.fetch` MUST have been called at least once with the URL `/api/metrics/cpu`

#### Scenario: Failed CPU fetch does not crash the component
- **WHEN** the test environment mounts `<App />` with `global.fetch` stubbed so that `/api/metrics/cpu` rejects with `new Error('network')` and `/healthz` resolves successfully
- **THEN** `<App />` MUST NOT throw out of its render
- **AND** the rendered DOM MUST still contain an element identified by `data-testid="cpu-chart"` (the chart container MUST mount even when its series is empty)
- **AND** the rendered DOM MUST still contain a visible text node whose accessible text matches the substring `Backend: ok`

#### Scenario: App polls /api/metrics/cpu at the configured interval
- **WHEN** the test environment activates `vi.useFakeTimers()`, mounts `<App />` with `/healthz`, `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk` all stubbed to resolve successfully
- **AND** the test advances time via `await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)` exactly N times after the initial mount-tick has been flushed
- **THEN** the count of `global.fetch` invocations whose URL equals `/api/metrics/cpu` MUST be at least `N + 1` (initial fetch plus one per interval)

### Requirement: useCpu hook encapsulates /api/metrics/cpu fetch and exposes data plus tri-state status

The frontend SHALL expose a `useCpu()` React hook from
`src/hooks/useCpu.ts` which encapsulates the polled retrieval of
`/api/metrics/cpu` and returns an object with two fields: `data` (whose
value is either `null` before the first response resolves, or a
`CpuChartRow[]` produced by `toCpuSeries` after at least one successful
response) and `status` (whose value is one of the string literals
`'loading'`, `'ok'`, or `'error'`). The hook SHALL be implemented as a
thin wrapper around `useMetricPolling`, supplying `getCpu` (from
`src/lib/api.ts`) as the fetcher and `toCpuSeries` (from
`src/lib/toCpuSeries.ts`) as the transform. The hook SHALL NOT call
`fetch` directly. The hook MAY use `setInterval` indirectly through
`useMetricPolling`; it MUST NOT have its own direct call to
`setInterval` or `setTimeout`. The hook SHALL inherit the
setState-after-unmount safety guarantees of `useMetricPolling`.

#### Scenario: useCpu returns 'loading' and null data before the request resolves
- **WHEN** a component renders `useCpu()` with `global.fetch` mocked to a never-resolving promise
- **THEN** the initial value of the returned `status` MUST be `'loading'`
- **AND** the initial value of the returned `data` MUST be `null`

#### Scenario: useCpu returns 'ok' and a CpuChartRow array after a successful fetch
- **WHEN** a component renders `useCpu()` with `global.fetch` mocked to resolve to `{ ok: true, status: 200, json: async () => ({ usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z' }) }`
- **THEN** the returned `status` MUST eventually become `'ok'`
- **AND** the returned `data` MUST eventually be a non-empty array
- **AND** the element at index 0 of `data` MUST have `time === Date.parse('2026-05-19T10:00:00Z')` and `usage === 7`

#### Scenario: useCpu returns 'error' when the fetch rejects
- **WHEN** a component renders `useCpu()` with `global.fetch` mocked to reject
- **THEN** the returned `status` MUST eventually become `'error'`

#### Scenario: useCpu delegates to api helpers, transforms, and the polling hook
- **WHEN** a reviewer reads `src/hooks/useCpu.ts`
- **THEN** the file MUST import `getCpu` from `../lib/api` (or equivalent relative path)
- **AND** the file MUST import `toCpuSeries` from `../lib/toCpuSeries` (or equivalent relative path)
- **AND** the file MUST import `useMetricPolling` from `./useMetricPolling` (or equivalent relative path)
- **AND** the file MUST NOT contain a direct call to `fetch(...)`
- **AND** the file MUST NOT contain a direct call to `setInterval(...)` or `setTimeout(...)` (such scheduling is permitted only indirectly through `useMetricPolling`)
