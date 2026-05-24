## Why

`BACKGROUND.md` names the reviewer-facing deliverables, but the current main specs do not require the README install/run flow and still describe some BACKGROUND requirements as if they came from README. This leaves a small but visible mismatch for reviewers who start from the assignment brief.

## What Changes

- Require `README.md` to document the install/run flow in Traditional Chinese, including `npm install`, `node server.js`, `npm start`, and the reviewer verification path.
- Correct constitution spec wording so `BACKGROUND.md`, not README, is the source for verification steps and the NetData allowance.
- Explicitly document that the assignment's `components/` deliverable is satisfied by chart components under `src/components/` in this Vite application.
- Keep runtime behavior, APIs, dependencies, package scripts, and tests unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `project-constitution`: Align source-of-truth language with `BACKGROUND.md` and remove stale README references.
- `frontend-app`: Add reviewer-facing README install/run requirements and clarify the `src/components/` chart component location.

## Impact

- Affected files during implementation: `README.md`, `docs/mission.md`, and OpenSpec specs for `project-constitution` and `frontend-app`.
- No application code, public API, package script, dependency, database, or migration impact.
