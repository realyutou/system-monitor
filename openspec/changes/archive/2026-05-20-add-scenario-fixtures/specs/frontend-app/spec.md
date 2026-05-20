## ADDED Requirements

### Requirement: Frontend charts replay scenario fixtures
The frontend SHALL use the canonical `idle`, `medium-load`, and `peak` fixtures in scenario tests for CPU, memory, and disk chart replay. For each fixture, tests SHALL feed expected DTOs into the existing conversion helpers (`toCpuSeries`, `toMemorySeries`, and `toDiskSnapshot`) and render the corresponding chart components with the converted rows.

Fixture replay SHALL NOT add optional Dashboard data props, fixture-mode runtime branches, new endpoints, or package dependencies. The existing chart component prop contracts, polling hooks, and API URL constants SHALL remain unchanged.

#### Scenario: Idle fixture renders metric charts
- **WHEN** a React Testing Library scenario test loads the `idle` fixture and replays its expected CPU, memory, and disk DTOs through the frontend conversion helpers and chart components
- **THEN** the converted CPU rows MUST equal the fixture's expected CPU chart rows
- **AND** the converted memory rows MUST equal the fixture's expected memory chart rows
- **AND** the converted disk rows MUST equal the fixture's expected disk chart rows
- **AND** the CPU, Memory, and Disk chart components MUST render their existing chart test identifiers

#### Scenario: Medium-load fixture renders metric charts
- **WHEN** a React Testing Library scenario test loads the `medium-load` fixture and replays its expected CPU, memory, and disk DTOs through the frontend conversion helpers and chart components
- **THEN** the converted CPU rows MUST equal the fixture's expected CPU chart rows
- **AND** the converted memory rows MUST equal the fixture's expected memory chart rows
- **AND** the converted disk rows MUST equal the fixture's expected disk chart rows
- **AND** the CPU, Memory, and Disk chart components MUST render their existing chart test identifiers

#### Scenario: Peak fixture renders metric charts
- **WHEN** a React Testing Library scenario test loads the `peak` fixture and replays its expected CPU, memory, and disk DTOs through the frontend conversion helpers and chart components
- **THEN** the converted CPU rows MUST equal the fixture's expected CPU chart rows
- **AND** the converted memory rows MUST equal the fixture's expected memory chart rows
- **AND** the converted disk rows MUST equal the fixture's expected disk chart rows
- **AND** the CPU, Memory, and Disk chart components MUST render their existing chart test identifiers

### Requirement: Scenario verification command is reviewer-runnable
The roadmap phase #8 verification command SHALL be supported by scenario-named test files so `npm test -- scenarios` runs the deterministic fixture coverage. The focused command SHALL execute at least nine scenario cases covering `3 fixtures x 3 metrics`.

#### Scenario: Focused scenario test command passes
- **WHEN** a reviewer runs `npm test -- scenarios`
- **THEN** Vitest MUST run the scenario fixture tests
- **AND** the command MUST pass
- **AND** the executed scenario coverage MUST include CPU, memory, and disk cases for all three canonical fixtures
