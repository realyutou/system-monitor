## Context

This change implements `docs/roadmap.md` phase #8. The app already has live metric endpoints, polling hooks, and Recharts components, but its tests mostly use inline samples or single idle chart fixtures. Reviewers need deterministic workload scenarios that prove CPU, memory, and disk behavior for idle, medium-load, and peak states without depending on the machine running the tests.

The constitution keeps the work inside the current stack: Node.js 20, `node:http`, `systeminformation`, React 18, TypeScript, Vite, Recharts, Vitest, Supertest, and React Testing Library. The selected fixture approach is raw collector-like samples plus expected DTO/chart outputs, replayed through helpers and chart components rather than by widening `<Dashboard />`.

## Goals / Non-Goals

**Goals:**

- Provide three canonical scenarios named `idle`, `medium-load`, and `peak`.
- Make each fixture useful for both backend mapper tests and frontend chart/conversion tests.
- Extract pure mapper functions from backend metric readers without changing HTTP route behavior.
- Add scenario test files that run through `npm test -- scenarios` and cover at least `3 fixtures x 3 metrics`.
- Document fixture names and intended workload shapes for reviewer reuse.

**Non-Goals:**

- Do not add fixture mode, seed mode, query parameters, or new runtime endpoints.
- Do not change DTO wire shapes, polling behavior, chart props, package scripts, or dependencies.
- Do not add Dashboard data props; replay fixtures through existing conversion helpers and chart components.
- Do not call real `systeminformation`, timers, or live `fetch` from scenario tests.

## Decisions

### 1. Fixtures contain raw samples and expected outputs

Each scenario fixture stores raw collector-like inputs, expected backend DTOs, and expected frontend chart rows. CPU and memory include short time series samples so line charts can prove shape; disk includes a raw `fsSize()`-like snapshot with at least one filtered-out row so the backend filter remains covered.

Alternatives considered:

- API DTO only: smaller fixtures, but backend mapper tests would need separate inline raw samples.
- Chart rows only: fastest for frontend tests, but it weakens the backend coverage required by the roadmap.

### 2. Backend mapping is extracted into pure functions

`server/metricsRouter.js` will export `toCpuMetricDto(load, timestamp)`, `toMemoryMetricDto(mem)`, and `toDiskMetricDto(fsRows)`. Existing `readCpu()`, `readMemory()`, and `readDisk()` continue to call `systeminformation` and delegate to these mappers.

Alternatives considered:

- Mock `systeminformation` directly in scenario tests: possible, but less direct than testing the conversion behavior and more brittle under ESM mocking.
- Route-level scenario tests only: keeps internals hidden, but requires runtime fixture injection that is out of scope for this demo.

### 3. Frontend replay stays at helper/component level

Scenario tests will feed expected DTOs into `toCpuSeries`, `toMemorySeries`, and `toDiskSnapshot`, then render `CpuChart`, `MemoryChart`, and `DiskChart` with the resulting rows. This verifies the deterministic chart path without adding a Dashboard fixture API.

Alternatives considered:

- Optional Dashboard data props: useful for full-page replay, but expands public component surface just for tests.
- Mock fetch only: keeps component APIs unchanged, but it primarily retests polling/fetch behavior already covered by phase #6.

## Risks / Trade-offs

- Fixture duplication can drift from mapper behavior -> Keep expected outputs in one canonical fixture module and have tests compare mappers/helpers against those values.
- TypeScript fixtures under `tests/` are outside the production `tsconfig` include -> Vitest can transform imported TS fixtures, and production build remains scoped to `src/`.
- Chart DOM assertions can be brittle against Recharts internals -> Assert stable wrappers, SVG presence, line paths for line charts, and fixture labels/values rather than snapshotting full chart DOM.
