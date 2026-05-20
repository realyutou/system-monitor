## ADDED Requirements

### Requirement: Backend metric mappers replay scenario fixtures
The backend SHALL expose pure mapper functions from `server/metricsRouter.js` for CPU, memory, and disk metric DTO conversion. `toCpuMetricDto(load, timestamp)` SHALL map a `systeminformation.currentLoad()`-like sample into the existing CPU DTO shape. `toMemoryMetricDto(mem)` SHALL map a `systeminformation.mem()`-like sample into the existing memory DTO shape. `toDiskMetricDto(fsRows)` SHALL map and filter `systeminformation.fsSize()`-like rows into the existing disk DTO shape.

The existing `readCpu()`, `readMemory()`, and `readDisk()` helpers SHALL preserve their parameterless public shape and SHALL delegate DTO conversion to these mapper functions after collecting live data. The HTTP route response contracts SHALL remain unchanged.

#### Scenario: Idle fixture maps to backend DTOs
- **WHEN** a Vitest scenario test loads the `idle` fixture through `loadFixture('idle')` and passes its raw CPU, memory, and disk samples through the exported mapper functions
- **THEN** the mapped CPU DTOs MUST equal the fixture's expected CPU DTOs
- **AND** the mapped memory DTOs MUST equal the fixture's expected memory DTOs
- **AND** the mapped disk DTO MUST equal the fixture's expected disk DTO

#### Scenario: Medium-load fixture maps to backend DTOs
- **WHEN** a Vitest scenario test loads the `medium-load` fixture through `loadFixture('medium-load')` and passes its raw CPU, memory, and disk samples through the exported mapper functions
- **THEN** the mapped CPU DTOs MUST equal the fixture's expected CPU DTOs
- **AND** the mapped memory DTOs MUST equal the fixture's expected memory DTOs
- **AND** the mapped disk DTO MUST equal the fixture's expected disk DTO

#### Scenario: Peak fixture maps to backend DTOs
- **WHEN** a Vitest scenario test loads the `peak` fixture through `loadFixture('peak')` and passes its raw CPU, memory, and disk samples through the exported mapper functions
- **THEN** the mapped CPU DTOs MUST equal the fixture's expected CPU DTOs
- **AND** the mapped memory DTOs MUST equal the fixture's expected memory DTOs
- **AND** the mapped disk DTO MUST equal the fixture's expected disk DTO

### Requirement: Scenario fixtures are canonical and documented
The repository SHALL provide canonical metric scenario fixtures named exactly `idle`, `medium-load`, and `peak` under `tests/fixtures/`. Each fixture SHALL include raw collector-like samples and expected outputs for CPU, memory, and disk. The fixture directory SHALL expose a `loadFixture(name)` helper that returns a scenario by name and fails clearly for unknown names.

The fixture directory SHALL document the three scenario names and their intended workload meaning so reviewers can understand and reuse the deterministic data.

#### Scenario: Fixture helper loads the three roadmap scenarios
- **WHEN** a Vitest test calls `loadFixture('idle')`, `loadFixture('medium-load')`, and `loadFixture('peak')`
- **THEN** each call MUST return a fixture whose `name` equals the requested name
- **AND** each returned fixture MUST include CPU, memory, and disk raw samples plus expected DTO/chart outputs

#### Scenario: Unknown fixture names fail clearly
- **WHEN** a Vitest test calls `loadFixture('does-not-exist')`
- **THEN** the helper MUST throw an error whose message includes the unknown fixture name
