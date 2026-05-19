# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A React + TypeScript / Node.js **local system monitoring dashboard** built as a teaching / portfolio demo. Reviewer expectations (LCP < 2s, real-time updates, RWD, ≥ 3 test scenarios, correct chart rendering) live in [`BACKGROUND.md`](./BACKGROUND.md).

## Source of truth: the constitution

Before writing any code, suggesting a library, or planning a change, read these three files. They are the canonical answer for "what / why / when":

- [`docs/mission.md`](./docs/mission.md) — positioning, audience, success definition, non-goals, **mandatory TDD**.
- [`docs/tech-stack.md`](./docs/tech-stack.md) — pinned choices and rejected alternatives (Vitest one-runner, Recharts over Chart.js, no NetData, no Jest).
- [`docs/roadmap.md`](./docs/roadmap.md) — the 8 implementation phases as a `🔴 Red → 🟢 Green → ♻️ Refactor` table, each with a verification command.

If a request conflicts with the constitution, **amend the constitution first via a new openspec change**, then implement. Do not silently deviate.

## Non-negotiable rules

- **TDD is mandatory.** Every code change starts with a failing test (Vitest / Supertest / React Testing Library). Skipping the test must be explicit and justified in the commit (e.g., pure visual/RWD tweak). See `docs/mission.md` §品質原則.
- **Tech stack is pinned.** React 18 + TypeScript + Vite + Recharts on the frontend; Node.js 20 + `systeminformation` (with `node:os` fallback) on the backend; Vitest + Supertest + RTL for tests. Do not propose alternatives — open a constitution amendment instead.
- **HTTP framework is intentionally undecided.** Roadmap stage 1 (`/healthz`) is the moment Express / Fastify / `node:http` gets chosen. Until then, don't pre-commit to one.
- **Polling first.** Default to `GET /api/metrics/*` polling at 2s. Only escalate to SSE/WebSocket if a documented budget (`docs/tech-stack.md` §效能預算) is exceeded.

## Spec-driven workflow (openspec)

This repo uses [openspec](./openspec/config.yaml) with the `spec-driven` schema. Active capabilities live under `openspec/specs/`; in-flight proposals under `openspec/changes/`; completed work under `openspec/changes/archive/`.

The user drives the workflow via slash commands in `.claude/commands/opsx/`:

- `/opsx:propose <name>` — create a new change (proposal + design + delta specs + tasks).
- `/opsx:explore` — think-out-loud mode before proposing.
- `/opsx:apply <name>` — implement tasks from a change; mark `- [ ]` → `- [x]` as you go.
- `/opsx:archive <name>` — sync delta specs into main specs and move the change to `archive/`.

CLI commands you'll use directly:

```bash
openspec status --change <name> --json    # artifact + task progress
openspec instructions apply --change <n> --json   # context files + remaining tasks
openspec validate                          # check spec/change integrity
openspec archive <name> -y                 # sync delta specs + archive in one step
```

Each implementation phase from `docs/roadmap.md` should become its own openspec change (e.g., `add-healthz`, `add-cpu-metric`). Do not bundle multiple roadmap phases into one change — the per-phase verification command is the unit of review.

## Running the project

There is no `package.json` yet. The two end-state commands reviewers will run (per `BACKGROUND.md`) are:

```bash
node server.js   # backend
npm start        # frontend
```

These will become real once roadmap stages 1 and 4 land. Per-phase verification commands (e.g., `npm test -- healthz`, `curl -s localhost:3001/healthz`) are listed in `docs/roadmap.md`.
