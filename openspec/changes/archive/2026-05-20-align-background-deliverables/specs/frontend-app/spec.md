## ADDED Requirements

### Requirement: README documents install and run flow in Traditional Chinese

The repository root `README.md` SHALL provide the reviewer-facing install and run flow in Traditional Chinese. Commands, file paths, package names, framework names, and API paths MAY remain in their original technical spelling. The README SHALL cover dependency installation, backend startup via `node server.js`, frontend startup via `npm start`, and the reviewer verification steps from `BACKGROUND.md`.

#### Scenario: Reviewer can follow README to run the project
- **WHEN** a reviewer opens `README.md`
- **THEN** the README MUST include the command `npm install`
- **AND** the README MUST include the command `node server.js`
- **AND** the README MUST include the command `npm start`
- **AND** the README MUST describe that backend and frontend are started in separate terminals

#### Scenario: README preserves BACKGROUND verification path
- **WHEN** a reviewer opens `README.md`
- **THEN** the README MUST mention checking browser DevTools performance for the local `< 2s` page-load budget
- **AND** the README MUST mention confirming real-time updates
- **AND** the README MUST mention checking responsive layout across viewports
- **AND** the README MUST mention confirming chart rendering

#### Scenario: README uses Traditional Chinese as the main human language
- **WHEN** a reviewer opens `README.md`
- **THEN** the explanatory prose MUST be written primarily in Traditional Chinese
- **AND** commands, package names, file paths, and framework names MAY remain in English or literal code formatting

### Requirement: Chart components live under src/components

The frontend SHALL treat `src/components/` as the concrete chart-component directory for this Vite application. The assignment brief's `components/` deliverable SHALL be considered satisfied by chart components under `src/components/`, including the CPU, Memory, Disk, and Dashboard components.

#### Scenario: Chart components are discoverable in src/components
- **WHEN** a reviewer inspects the repository structure
- **THEN** `src/components/CpuChart.tsx` MUST exist
- **AND** `src/components/MemoryChart.tsx` MUST exist
- **AND** `src/components/DiskChart.tsx` MUST exist
- **AND** `src/components/Dashboard.tsx` MUST exist

#### Scenario: README points reviewers to the Vite component location
- **WHEN** a reviewer opens `README.md`
- **THEN** the README MUST identify `src/components/` as the location of chart components
