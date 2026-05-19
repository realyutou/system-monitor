## ADDED Requirements

### Requirement: Constitution files exist in docs/

The project SHALL maintain three constitution files at `docs/mission.md`, `docs/tech-stack.md`, and `docs/roadmap.md`. These files together form the single source of truth for the project's purpose, technology choices, and implementation order.

#### Scenario: All three constitution files are present after this change archives
- **WHEN** a contributor inspects the repository after `add-project-constitution` is applied
- **THEN** the three files `docs/mission.md`, `docs/tech-stack.md`, and `docs/roadmap.md` MUST exist and be non-empty

#### Scenario: Future changes reference the constitution
- **WHEN** any subsequent `/opsx:propose` change is created
- **THEN** its `proposal.md` or `design.md` MUST cite or otherwise stay consistent with the constitution files; conflicting proposals MUST first amend the constitution

### Requirement: mission.md fixes scope and quality discipline

`docs/mission.md` SHALL declare the project as a teaching / portfolio demo, identify the intended audience, define success in terms of the README's verification steps, list explicit non-goals, and name TDD as a mandatory quality discipline.

#### Scenario: Reader learns the project's identity
- **WHEN** a reader opens `docs/mission.md`
- **THEN** they MUST find sections covering: positioning ("teaching / portfolio demo"), audience, success definition, non-goals, and quality principles

#### Scenario: TDD is stated as mandatory
- **WHEN** a reader reaches the quality principles section of `docs/mission.md`
- **THEN** the text MUST state that any code change is preceded by a failing test (red → green → refactor)

### Requirement: tech-stack.md pins technology choices with rationale

`docs/tech-stack.md` SHALL list the chosen frontend stack (React + TypeScript + Vite + Recharts), backend stack (Node.js + `systeminformation` / `node:os`), testing stack (Vitest + Supertest + React Testing Library), and SHALL record the rationale for rejecting NetData, Chart.js, and Jest.

#### Scenario: Implementer looks up the chart library
- **WHEN** an implementer needs to know which chart library to use
- **THEN** `docs/tech-stack.md` MUST name Recharts and explain in 2–3 sentences why it was chosen over Chart.js

#### Scenario: Implementer looks up the test framework
- **WHEN** an implementer needs to know which test framework to use
- **THEN** `docs/tech-stack.md` MUST name Vitest for both frontend and backend, Supertest for API tests, and React Testing Library for UI tests

#### Scenario: NetData is explicitly out
- **WHEN** a reviewer asks why NetData (allowed by the README) is not used
- **THEN** `docs/tech-stack.md` MUST contain an explicit rationale entry

### Requirement: roadmap.md splits implementation into TDD-shaped phases

`docs/roadmap.md` SHALL contain 6 to 8 implementation phases. Each phase SHALL be presented with at minimum these columns or labelled sections: a goal, a Red step (failing test to write first), a Green step (minimal implementation), an optional Refactor step, and a verification command.

#### Scenario: Phase count is within bounds
- **WHEN** the reader counts the implementation phases in `docs/roadmap.md`
- **THEN** the count MUST be between 6 and 8 inclusive

#### Scenario: Each phase shows the TDD cycle
- **WHEN** the reader opens any phase entry in `docs/roadmap.md`
- **THEN** that phase MUST identify the failing test to write first (Red) and the minimal implementation that makes it pass (Green)

#### Scenario: Each phase is independently verifiable
- **WHEN** the reader wants to confirm a phase is complete
- **THEN** the phase MUST list a verification command (e.g. `npm test -- cpu`, `curl localhost:3001/healthz`) that produces a binary pass/fail result
