## Why

`docs/roadmap.md` phase #8 requires at least three named metric scenarios with corresponding Vitest coverage, so reviewers can verify the dashboard against deterministic idle, medium-load, and peak data rather than live workstation state only.

## What Changes

- Add canonical `idle`, `medium-load`, and `peak` fixtures under `tests/fixtures/`.
- Store raw collector-like samples plus expected backend DTOs and frontend chart rows in each fixture.
- Add a `loadFixture(name)` helper for deterministic scenario replay in tests.
- Extract pure backend DTO mapper functions for CPU, memory, and disk so fixture tests can verify mapping without calling `systeminformation`.
- Add scenario-focused Vitest coverage for CPU, memory, and disk across backend DTO mapping and frontend chart/helper replay.
- Document fixture names and contents for reviewer reuse.

## Capabilities

### New Capabilities
<!-- None. This change extends existing backend and frontend capabilities. -->

### Modified Capabilities
- `backend-server`: Add deterministic scenario fixture requirements for metric DTO mapping.
- `frontend-app`: Add deterministic scenario fixture requirements for chart/conversion replay.

## Impact

- **OpenSpec artifacts**: `openspec/changes/add-scenario-fixtures/{proposal.md, design.md, tasks.md, specs/*/spec.md}`.
- **Planned implementation surface**: `tests/fixtures/`, focused scenario tests, pure metric mapper exports in `server/metricsRouter.js`, and fixture usage in frontend helper/chart tests.
- **Public APIs / contracts**: no HTTP route, DTO wire shape, polling interval, chart prop type, package script, or dependency changes.
- **Reviewer flow**: `npm test -- scenarios` should pass with at least nine scenario cases covering `3 fixtures x 3 metrics`.
