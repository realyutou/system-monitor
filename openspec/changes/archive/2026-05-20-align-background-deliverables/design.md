## Context

The application already satisfies the main implementation phases, but the assignment brief in `BACKGROUND.md` still has two documentation-level gaps in the active specs: the README install/run flow is not required, and some constitution text refers to README where `BACKGROUND.md` is the actual source. The current README is only a pointer to `docs/`, so a reviewer starting from the repo root does not get the required install/run path.

## Goals / Non-Goals

**Goals:**
- Make `BACKGROUND.md` the named source for reviewer verification steps and the NetData allowance.
- Require `README.md` to use Traditional Chinese for the human-facing install/run flow while preserving commands and technical names in their original spelling.
- Clarify that chart components live under `src/components/`, which is the Vite app's concrete location for the assignment's `components/` deliverable.

**Non-Goals:**
- No runtime behavior changes.
- No package script, dependency, API, route, chart, polling, or test runner changes.
- No automated browser-performance tooling.

## Decisions

- Treat this as a documentation/spec-only change. The existing app behavior and test suite already cover the dashboard mechanics; this change only closes reviewer-facing specification gaps.
- Keep README in Traditional Chinese because the user explicitly requested it, but leave commands, file paths, package names, and framework names as literals.
- Add README and component-location requirements to `frontend-app`, because they govern the shipped frontend deliverable and reviewer run flow.
- Modify existing `project-constitution` requirements rather than add duplicate source-of-truth requirements, so archive keeps one coherent contract for mission and tech-stack language.

## Risks / Trade-offs

- README content can become stale as scripts change -> mitigate by tying README commands to existing package-script and backend-launch requirements.
- `BACKGROUND.md` says `components/` while the app uses `src/components/` -> mitigate by explicitly documenting `src/components/` as the project-specific fulfillment of that deliverable.
- This change does not prove LCP or RWD again -> mitigate by leaving existing performance and responsive specs unchanged.
