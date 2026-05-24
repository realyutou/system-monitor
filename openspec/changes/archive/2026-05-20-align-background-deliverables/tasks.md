## 1. Documentation Updates

- [x] 1.1 Replace the root `README.md` placeholder with Traditional Chinese project overview, install flow, and run instructions.
- [x] 1.2 Document the backend/frontend split in README: run `node server.js` and `npm start` in separate terminals.
- [x] 1.3 Add README reviewer checks for DevTools performance `< 2s`, real-time updates, responsive layout, and chart rendering.
- [x] 1.4 Identify `src/components/` in README as the chart component location for CPU, Memory, Disk, and Dashboard.

## 2. Constitution Alignment

- [x] 2.1 Update `docs/mission.md` stale wording so NetData allowance references `BACKGROUND.md`, not README.
- [x] 2.2 Confirm `docs/mission.md` continues to define success from `BACKGROUND.md` verification steps and preserves TDD rules.
- [x] 2.3 Confirm `docs/tech-stack.md` still documents the NetData rejection rationale without changing stack choices.

## 3. Verification

- [x] 3.1 Run `openspec validate --specs` after applying the change.
- [x] 3.2 Inspect README to confirm the main prose is Traditional Chinese while commands and technical names remain literal.
- [x] 3.3 Confirm no app code, package scripts, dependencies, or test runner behavior changed.
