## 1. Red: Responsive Snapshot and CSS Contract Tests

- [x] 1.1 Add `src/components/Dashboard.snapshot.test.tsx` with deterministic fetch stubs for `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk`.
- [x] 1.2 Add helpers in that test file to set viewport width to `1280`, `768`, and `375` and dispatch a resize event before rendering `<Dashboard />`.
- [x] 1.3 Add three RTL snapshot cases for the desktop, tablet, and mobile widths; each case waits for CPU, Memory, and Disk headings and asserts the three chart test IDs exist.
- [x] 1.4 Add CSS source assertions against `src/App.module.css` proving `.main` no longer depends on `min-width: 640px`, media queries exist for tablet/mobile layout, chart wrappers or SVGs are constrained with `max-width: 100%`, and page layout does not vertically clip dashboard content.
- [x] 1.5 Run `npm test -- snapshot` and confirm the new tests fail for the current fixed-width layout before implementation.

## 2. Green: Responsive Layout Implementation

- [x] 2.1 Update `src/App.module.css` to remove the fixed mobile blocker from `.main`, allow vertical scrolling on small screens, and keep horizontal overflow controlled.
- [x] 2.2 Add CSS media queries for desktop/tablet/mobile dashboard spacing and layout, preserving the current visual style.
- [x] 2.3 Add chart wrapper/SVG constraints so the existing fixed Recharts dimensions fit within the available viewport width.
- [x] 2.4 If needed for stable responsive layout, update `src/components/Dashboard.tsx` to group each metric chart with its notice/timestamp while preserving hook ownership, chart order, headings, and all existing test IDs.
- [x] 2.5 Run `npm test -- snapshot` and update/commit the generated snapshots once the responsive behavior matches the spec.

## 3. Refactor and Regression Checks

- [x] 3.1 Remove duplicated responsive constants/selectors in CSS and keep responsive rules centralized in `src/App.module.css`.
- [x] 3.2 Verify existing Dashboard, App, chart, polling, and server tests still pass with `npm test`.
- [x] 3.3 Verify production compile still succeeds with `npm run build`.
- [x] 3.4 Confirm `package.json` has no new dependencies/devDependencies and its existing scripts remain unchanged.

## 4. Manual Reviewer Verification

- [x] 4.1 Start the backend with `node server.js` and the frontend with `npm start`.
- [x] 4.2 In Chrome, verify the dashboard at 1280px, 768px, and 375px: all three chart sections remain readable and no horizontal page scrolling is needed.
- [x] 4.3 Capture Chrome DevTools Performance evidence showing Largest Contentful Paint `< 2.0s`.
- [x] 4.4 If LCP is `>= 2.0s`, document the observed value and apply the smallest in-scope mitigation before re-running the measurement.
  - Observed LCP before mitigation: `2.116s` from raw epoch chart tick text after the 2s polling update. Mitigation: format CPU/Memory x-axis ticks as compact `HH:mm:ss` labels. Re-run LCP: `0.080s`.

## 5. OpenSpec Hygiene

- [x] 5.1 Run `openspec validate add-rwd-performance-verification --strict` and fix any proposal/spec formatting issues.
- [x] 5.2 Run `openspec status --change add-rwd-performance-verification` and confirm proposal, design, specs, and tasks are complete before applying implementation work.

## 6. Local Time Axis Labels

- [x] 6.1 Update the frontend-app spec to require CPU/Memory X-axis tick labels to use the browser/system local time zone.
- [x] 6.2 Add failing tests proving `2026-05-20T10:00:00Z` renders as `18:00:00` when the runtime time zone is `Asia/Taipei`, not UTC `10:00:00`.
- [x] 6.3 Update the chart time formatter to use the system local time zone while preserving compact `HH:mm:ss` labels and raw-epoch suppression.
- [x] 6.4 Run focused chart/formatter tests, `npm test -- snapshot`, `npm test`, `npm run build`, and `openspec validate add-rwd-performance-verification --strict`.
