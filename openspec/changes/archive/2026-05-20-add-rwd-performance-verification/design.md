## Context

This change implements `docs/roadmap.md` phase #7. Phase #6 already renders `<Dashboard />` with CPU, memory, and disk charts, but the current layout is still shaped like a fixed-width desktop view: the chart components default to 600px wide, `.main` currently has a fixed `min-width: 640px`, and the page clips overflow. That is enough for desktop validation but weak for the required 1280px, 768px, and 375px responsive review.

The constitution keeps this change inside the existing stack: React 18, TypeScript, Vite, Recharts, Vitest, React Testing Library, and plain CSS/CSS Modules. The user selected a CSS-only responsive strategy and manual Chrome DevTools evidence for LCP.

## Goals / Non-Goals

**Goals:**

- Make the existing dashboard readable at 1280px, 768px, and 375px without horizontal overflow.
- Keep CPU, memory, and disk chart headings, polling behavior, error notices, disk last-updated text, and the `Backend: ok` contract intact.
- Add deterministic RTL snapshots for the three viewport widths.
- Add source-level CSS contract tests for RWD rules that jsdom cannot compute.
- Preserve the current visual style and font choices unless manual LCP verification fails.

**Non-Goals:**

- Do not introduce `useViewport()`, browser-test tooling, Playwright, Lighthouse CI, or new dependencies.
- Do not change backend routes, DTO shapes, polling intervals, chart prop types, hook return types, or package scripts.
- Do not remove the Google Fonts import during this proposal; it remains a possible mitigation only if LCP misses the budget during apply.
- Do not commit a DevTools screenshot or other binary performance artifact.

## Decisions

### 1. CSS-only RWD instead of viewport-driven React state

Use media queries and responsive CSS constraints in `src/App.module.css` to adapt spacing and chart layout. Keep React component APIs unchanged.

Why: the user selected CSS-only testing. This keeps phase #7 narrow and avoids introducing a hook whose only purpose would be to make jsdom layout more observable. The trade-off is that RTL snapshots will not prove pixel layout by themselves, so the test plan pairs snapshots with CSS contract assertions.

Alternatives considered:

- `useViewport()` plus chart-size props: stronger DOM-level snapshots, but it adds runtime state and was not the chosen strategy.
- Browser screenshot tests: best visual signal, but adds tooling beyond the pinned Vitest/RTL stack.

### 2. Keep Recharts fixed dimensions, constrain wrappers with CSS

Continue passing existing chart dimensions through component defaults, and make their containing elements and rendered SVGs respect `max-width: 100%`.

Why: the current chart contracts explicitly avoid `<ResponsiveContainer>` because jsdom cannot provide reliable layout metrics. CSS constraints are the smallest change that prevents horizontal overflow while preserving the Recharts testing strategy.

Alternatives considered:

- Switch to `<ResponsiveContainer>`: rejected because it conflicts with existing spec requirements and would make RTL tests less reliable.
- Change chart defaults globally: possible, but more likely to perturb chart rendering snapshots and existing tests than wrapper constraints.

### 3. Group chart-adjacent status text only if needed

If CSS grid/flex needs a stable unit per metric, wrap each chart plus its notice/timestamp in a lightweight Dashboard child element. Do not move hook ownership out of `<Dashboard />`, and do not duplicate chart headings.

Why: a metric-level wrapper gives media queries a stable target while preserving visible behavior. The chart components remain responsible for their own headings.

Alternatives considered:

- Leave all Dashboard children flat: acceptable if CSS can target the existing structure cleanly, but fragile because notices and timestamps are independent siblings.
- Push grouping into chart components: rejected because disk’s last-updated text and error notices are Dashboard concerns.

### 4. Manual LCP proof stays outside the repo

Require the apply verification to capture Chrome DevTools Performance evidence showing LCP `< 2.0s`, but do not commit screenshots.

Why: `docs/mission.md` and `docs/tech-stack.md` define the reviewer-facing budget and measurement method, not a CI artifact. Keeping evidence manual avoids binary churn while still matching `docs/roadmap.md`.

Alternatives considered:

- Commit screenshot evidence: durable but noisy and machine-specific.
- Add Lighthouse CI or Playwright metrics: stronger automation, but out of scope and adds dependencies/tooling.

## Risks / Trade-offs

- jsdom does not compute real CSS layout -> pair snapshots with CSS source assertions and manual browser verification.
- Fixed-width Recharts SVGs may still be visually dense on mobile -> constrain overflow first; if readability remains poor during apply, tune chart dimensions through existing props without changing public types.
- Google Fonts can add LCP noise on a cold network -> keep fonts per user choice; if manual LCP exceeds 2 seconds, treat font loading as the first documented mitigation candidate.
- Snapshot tests can become brittle if dynamic timestamps render during polling -> stub fetches and use stable assertions/snapshots that wait only for deterministic DOM structure.
