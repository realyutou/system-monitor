## 1. Red: Scenario Fixture Tests

- [x] 1.1 Add backend scenario tests that load `idle`, `medium-load`, and `peak` fixtures and expect CPU, memory, and disk mapper outputs to match fixture DTOs.
- [x] 1.2 Add frontend scenario tests that replay the same fixtures through `toCpuSeries`, `toMemorySeries`, `toDiskSnapshot`, `CpuChart`, `MemoryChart`, and `DiskChart`.
- [x] 1.3 Add fixture helper tests for successful `loadFixture()` lookups and clear unknown-name failures.
- [x] 1.4 Run `npm test -- scenarios` and confirm the scenario tests fail before implementation.

## 2. Green: Fixtures and Mapper Implementation

- [x] 2.1 Add `tests/fixtures/` canonical scenario fixture data for `idle`, `medium-load`, and `peak`, including raw inputs, expected DTOs, and expected chart rows.
- [x] 2.2 Add `loadFixture(name)` and related fixture exports for tests.
- [x] 2.3 Extract and export `toCpuMetricDto`, `toMemoryMetricDto`, and `toDiskMetricDto` from `server/metricsRouter.js`, then delegate existing readers to them without changing route behavior.
- [x] 2.4 Run `npm test -- scenarios` and confirm all scenario tests pass.

## 3. Refactor and Documentation

- [x] 3.1 Add fixture README documentation covering the three scenario names and workload meanings.
- [x] 3.2 Remove duplicated inline scenario data from tests and keep fixture expectations centralized.
- [x] 3.3 Run `npm test`, `npm run build`, and `openspec validate add-scenario-fixtures --strict`.
- [x] 3.4 Run `openspec status --change add-scenario-fixtures` and confirm proposal, design, specs, and tasks are complete.
