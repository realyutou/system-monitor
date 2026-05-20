## Why

`docs/roadmap.md` phase #7 requires the dashboard to become reviewer-ready across desktop, tablet, and mobile widths, and to provide evidence that local first-screen load stays under the `docs/tech-stack.md` LCP budget. The current dashboard uses fixed 600px charts and a `min-width: 640px` main area, which makes mobile verification fragile even though phase #6 already renders the required three charts.

## What Changes

- Add responsive layout requirements for `<Dashboard />` at 1280px, 768px, and 375px viewport widths.
- Add snapshot coverage for the three target widths using React Testing Library and deterministic metric fetch stubs.
- Add CSS contract coverage for the key RWD rules that jsdom cannot compute reliably: no fixed mobile min-width, chart containers constrained to the viewport, media-query coverage, and no vertical clipping of dashboard content.
- Allow minimal Dashboard markup grouping only where needed to keep each chart, notice, and timestamp together across breakpoints.
- Keep the existing visual style, chart headings, polling behavior, endpoint contracts, and `Backend: ok` health contract unchanged.
- Require manual Chrome DevTools Performance evidence that local LCP is `< 2.0s`; the evidence is collected during verification and not committed as a binary artifact.

## Capabilities

### New Capabilities
<!-- None. This change extends the existing frontend-app capability. -->

### Modified Capabilities
- `frontend-app`: Add responsive dashboard requirements and manual LCP verification requirements for phase #7.

## Impact

- **OpenSpec artifacts**: `openspec/changes/add-rwd-performance-verification/{proposal.md, design.md, tasks.md, specs/frontend-app/spec.md}`.
- **Planned implementation surface after approval**: `src/App.module.css`, `src/components/Dashboard.tsx`, and a new snapshot-focused Dashboard test file under `src/components/`.
- **Public APIs / contracts**: no backend API, DTO, hook, chart prop, polling interval, or package dependency changes.
- **Reviewer flow**: `npm test -- snapshot`, `npm test`, `npm run build`, then manual local browser verification with DevTools Performance showing LCP `< 2.0s`.
