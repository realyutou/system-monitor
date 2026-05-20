## ADDED Requirements

### Requirement: Dashboard layout is responsive at reviewer target widths

The frontend Dashboard SHALL render all three metric charts in a readable layout at viewport widths of 1280px, 768px, and 375px. At each target width, the Dashboard MUST preserve the visible CPU, Memory, and Disk chart title headings, MUST preserve the existing chart test identifiers (`cpu-chart`, `memory-chart`, `disk-chart`), and MUST NOT require horizontal page scrolling to inspect the chart area or the disk last-updated text.

The implementation SHALL use CSS media queries and responsive CSS constraints rather than JavaScript viewport state. The page and Dashboard layout MUST NOT impose a fixed minimum width that exceeds 375px. Chart containers and rendered chart SVGs MUST be constrained so their visual boxes fit within the available viewport width.

CPU and Memory chart X-axis timestamp ticks SHALL render in the browser/system local time zone. The formatter MUST NOT derive tick labels from UTC-only ISO strings, because the dashboard represents local machine metrics and reviewer-visible time labels must match the local system clock.

#### Scenario: Dashboard snapshot is stable at desktop width
- **WHEN** a React Testing Library test sets the viewport width to `1280`, stubs `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk` with shape-conforming successful responses, renders `<Dashboard />`, and waits for the chart headings to appear
- **THEN** the rendered output MUST match the committed desktop snapshot
- **AND** the DOM MUST contain chart headings whose accessible names include `CPU`, `Memory`, and `Disk`
- **AND** the DOM MUST contain elements identified by `data-testid="cpu-chart"`, `data-testid="memory-chart"`, and `data-testid="disk-chart"`

#### Scenario: Dashboard snapshot is stable at tablet width
- **WHEN** a React Testing Library test sets the viewport width to `768`, stubs `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk` with shape-conforming successful responses, renders `<Dashboard />`, and waits for the chart headings to appear
- **THEN** the rendered output MUST match the committed tablet snapshot
- **AND** the DOM MUST contain chart headings whose accessible names include `CPU`, `Memory`, and `Disk`
- **AND** the DOM MUST contain elements identified by `data-testid="cpu-chart"`, `data-testid="memory-chart"`, and `data-testid="disk-chart"`

#### Scenario: Dashboard snapshot is stable at mobile width
- **WHEN** a React Testing Library test sets the viewport width to `375`, stubs `/api/metrics/cpu`, `/api/metrics/memory`, and `/api/metrics/disk` with shape-conforming successful responses, renders `<Dashboard />`, and waits for the chart headings to appear
- **THEN** the rendered output MUST match the committed mobile snapshot
- **AND** the DOM MUST contain chart headings whose accessible names include `CPU`, `Memory`, and `Disk`
- **AND** the DOM MUST contain elements identified by `data-testid="cpu-chart"`, `data-testid="memory-chart"`, and `data-testid="disk-chart"`

#### Scenario: CSS removes fixed-width mobile blockers
- **WHEN** a test or reviewer inspects `src/App.module.css`
- **THEN** `.main` MUST NOT define `min-width: 640px`
- **AND** the stylesheet MUST define responsive media-query rules for Dashboard or page layout at tablet and mobile widths
- **AND** the stylesheet MUST include rules that constrain chart wrappers or chart SVGs with `max-width: 100%`
- **AND** the page layout MUST NOT use vertical overflow clipping that prevents dashboard content from scrolling on small screens

#### Scenario: Chart X-axis time labels follow the local system time zone
- **WHEN** a test renders CPU and Memory chart data with a timestamp of `2026-05-20T10:00:00Z` while the JavaScript runtime time zone is `Asia/Taipei`
- **THEN** the X-axis tick label MUST include `18:00:00`
- **AND** the rendered chart MUST NOT show the raw epoch timestamp
- **AND** the formatter MUST NOT show the UTC-only `10:00:00` label for that timestamp

### Requirement: Phase seven performance verification preserves the LCP budget

The frontend SHALL remain within the local first-screen performance budget defined by `docs/tech-stack.md`: Chrome DevTools Performance measurement after starting the backend with `node server.js` and the frontend with `npm start` MUST show Largest Contentful Paint below `2.0s`.

The repository SHALL NOT add automated browser-performance tooling or committed binary screenshot artifacts for this phase. Manual Chrome DevTools Performance evidence is the accepted verification artifact for reviewer handoff.

#### Scenario: Reviewer can verify LCP manually
- **WHEN** a reviewer starts the backend with `node server.js`, starts the frontend with `npm start`, opens the Vite dev URL in Chrome, and records a Performance trace after a normal reload
- **THEN** the measured Largest Contentful Paint MUST be `< 2.0s`
- **AND** the dashboard MUST show the health readout and all three chart sections during the measured first screen

#### Scenario: No new performance tooling is introduced
- **WHEN** a reviewer inspects `package.json`
- **THEN** the package dependencies and devDependencies MUST NOT add Lighthouse, Playwright, Puppeteer, or other browser-performance tooling for this phase
- **AND** the existing `start`, `build`, `preview`, `test`, and `test:watch` scripts MUST remain unchanged
