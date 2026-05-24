## MODIFIED Requirements

### Requirement: mission.md fixes scope and quality discipline

`docs/mission.md` SHALL declare the project as a teaching / portfolio demo, identify the intended audience, define success in terms of the `BACKGROUND.md` verification steps, list explicit non-goals, and name TDD as a mandatory quality discipline.

#### Scenario: Reader learns the project's identity
- **WHEN** a reader opens `docs/mission.md`
- **THEN** they MUST find sections covering: positioning ("teaching / portfolio demo"), audience, success definition, non-goals, and quality principles

#### Scenario: TDD is stated as mandatory
- **WHEN** a reader reaches the quality principles section of `docs/mission.md`
- **THEN** the text MUST state that any code change is preceded by a failing test (red -> green -> refactor)

### Requirement: tech-stack.md pins technology choices with rationale

`docs/tech-stack.md` SHALL list the chosen frontend stack (React + TypeScript + Vite + Recharts), backend stack (Node.js + `systeminformation` / `node:os`), testing stack (Vitest + Supertest + React Testing Library), and SHALL record the rationale for rejecting NetData, Chart.js, and Jest.

#### Scenario: Implementer looks up the chart library
- **WHEN** an implementer needs to know which chart library to use
- **THEN** `docs/tech-stack.md` MUST name Recharts and explain in 2-3 sentences why it was chosen over Chart.js

#### Scenario: Implementer looks up the test framework
- **WHEN** an implementer needs to know which test framework to use
- **THEN** `docs/tech-stack.md` MUST name Vitest for both frontend and backend, Supertest for API tests, and React Testing Library for UI tests

#### Scenario: NetData is explicitly out
- **WHEN** a reviewer asks why NetData (allowed by `BACKGROUND.md`) is not used
- **THEN** `docs/tech-stack.md` MUST contain an explicit rationale entry
