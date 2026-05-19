## ADDED Requirements

### Requirement: App fetches /healthz on initial mount and renders Backend: ok

The frontend SHALL ship a root React component `<App />` (rendered into the
DOM element with id `root` by `src/main.tsx`) which, on initial mount, issues
a single HTTP `GET /healthz` request (using `fetch`) and, upon receiving an
HTTP `200` response whose JSON body contains `{ "status": "ok" }`, renders
visible text that contains the substring `Backend: ok`, so reviewers can
verify the front-end is wired to the back-end by simply opening the Vite dev
server in a browser. The component MUST NOT crash, suspend, or throw if the
fetch fails; in that case it MUST continue to render a valid, non-empty UI
(the specific failure text is deliberately not constrained at this phase, to
leave room for richer error UI in later phases).

#### Scenario: Successful fetch displays Backend: ok
- **WHEN** the test environment mounts `<App />` with `global.fetch` mocked to resolve to `{ ok: true, status: 200, json: async () => ({ status: 'ok' }) }`
- **THEN** within the React effect cycle the DOM MUST contain a visible text node whose accessible text matches the substring `Backend: ok`
- **AND** `global.fetch` MUST have been called at least once with the URL `/healthz`

#### Scenario: Failed fetch does not crash the component
- **WHEN** the test environment mounts `<App />` with `global.fetch` mocked to reject with `new Error('network')`
- **THEN** `<App />` MUST NOT throw out of its render
- **AND** the rendered DOM MUST contain a non-empty `<main>` (or equivalent root) element
- **AND** the DOM MUST NOT contain the substring `Backend: ok`

### Requirement: Vite dev server proxies /healthz and /api to the backend on port 3001

The frontend Vite dev server (started by `npm start`) SHALL be configured via
`vite.config.ts` to proxy any request path beginning with `/healthz` or
`/api` to `http://localhost:3001`, so the browser sees same-origin requests
and the back-end `server.js` does not need any CORS middleware. The proxy
configuration SHALL NOT introduce any rewrite rules that change the request
path (the back-end receives the identical pathname the browser requested).

#### Scenario: vite.config.ts declares proxy for both /healthz and /api
- **WHEN** a reviewer reads `vite.config.ts`
- **THEN** the exported config MUST contain a `server.proxy` object
- **AND** that object MUST contain a key `/healthz` whose target is `http://localhost:3001`
- **AND** that object MUST contain a key `/api` whose target is `http://localhost:3001`

#### Scenario: Backend remains free of CORS middleware
- **WHEN** a reviewer inspects `server.js` and `server/metricsRouter.js`
- **THEN** neither file MUST import any CORS package
- **AND** neither file MUST write the response header `Access-Control-Allow-Origin`

### Requirement: useHealth hook encapsulates /healthz fetch and exposes a tri-state status

The frontend SHALL expose a `useHealth()` React hook from
`src/hooks/useHealth.ts` which encapsulates the `fetch('/healthz')` call,
manages the request's loading and resolved state internally, and returns an
object with a `status` field whose value is one of the string literals
`'loading'`, `'ok'`, or `'error'`. `<App />` SHALL consume `useHealth()` and
SHALL NOT call `fetch` directly. The hook SHALL be safe against `setState`
after unmount (it MUST guard against late resolutions writing to a
component that has already been unmounted).

#### Scenario: useHealth returns 'loading' before the request resolves
- **WHEN** a component renders `useHealth()` with `global.fetch` mocked to a never-resolving promise
- **THEN** the initial value of the returned `status` MUST be `'loading'`

#### Scenario: useHealth returns 'ok' after a successful fetch
- **WHEN** a component renders `useHealth()` with `global.fetch` mocked to resolve to `{ ok: true, status: 200, json: async () => ({ status: 'ok' }) }`
- **THEN** the returned `status` MUST eventually become `'ok'`

#### Scenario: useHealth returns 'error' when the fetch rejects
- **WHEN** a component renders `useHealth()` with `global.fetch` mocked to reject
- **THEN** the returned `status` MUST eventually become `'error'`

#### Scenario: App does not call fetch directly
- **WHEN** a reviewer reads `src/App.tsx`
- **THEN** `src/App.tsx` MUST NOT contain a direct call to `fetch(...)`
- **AND** `src/App.tsx` MUST import `useHealth` from `./hooks/useHealth` (or equivalent path)

### Requirement: Endpoint URLs are centralised in src/lib/api.ts

The frontend SHALL declare a single source of truth for back-end endpoint
URLs in `src/lib/api.ts`. At minimum, the file SHALL export a constant whose
value is the string `'/healthz'` and a zero-argument async function named
`getHealth` whose return value is a `Promise` resolving to an object with a
`status` field of type `string`. The `useHealth()` hook SHALL call
`getHealth()` rather than calling `fetch('/healthz')` directly.

#### Scenario: api.ts exports HEALTHZ_ENDPOINT and getHealth
- **WHEN** a reviewer imports from `src/lib/api.ts`
- **THEN** the module MUST export an identifier whose value is the string `'/healthz'`
- **AND** the module MUST export an async function `getHealth` with arity zero
- **AND** calling `getHealth()` (with `global.fetch` mocked to a successful response) MUST resolve to an object containing a `status` field whose value is a string

#### Scenario: useHealth delegates to getHealth
- **WHEN** a reviewer reads `src/hooks/useHealth.ts`
- **THEN** the file MUST import `getHealth` from `src/lib/api` (or equivalent relative path)
- **AND** the file MUST NOT contain a direct call to `fetch(...)`

### Requirement: Vitest runs frontend tests under jsdom and preserves the existing backend node environment

The frontend SHALL configure Vitest (via `vite.config.ts`) so that test
files under `src/**/*.test.{ts,tsx}` execute in the `jsdom` environment
(necessary for React Testing Library) while test files under
`tests/**/*.test.{js,ts}` continue to execute in the default `node`
environment, so the existing back-end test files in
`tests/server/*.test.js` SHALL continue to pass without modification.
React Testing Library's custom matchers SHALL be made available to frontend
test files via a Vitest setup file at `src/setupTests.ts`.

#### Scenario: Backend tests remain green after frontend toolchain lands
- **WHEN** a reviewer runs `npm test` from the repository root after this change is implemented
- **THEN** every test under `tests/server/` MUST pass
- **AND** every test under `src/` MUST pass
- **AND** no test file under `tests/server/` requires modification (no `// @vitest-environment` annotation added, no import path change)

#### Scenario: setupTests.ts wires jest-dom matchers
- **WHEN** a reviewer reads `src/setupTests.ts`
- **THEN** the file MUST import `@testing-library/jest-dom/vitest` (or `@testing-library/jest-dom` with an equivalent vitest-compatible import path)

### Requirement: npm start launches the frontend Vite dev server and the backend has no npm script wrapper

The `package.json` `scripts.start` entry SHALL invoke `vite` (the Vite dev
server) and SHALL NOT invoke `node server.js`. The back-end SHALL be
runnable directly via `node server.js` and the repository SHALL NOT
introduce any npm script alias for the back-end. `package.json` SHALL
additionally expose `scripts.build` (mapping to `vite build`) and
`scripts.preview` (mapping to `vite preview`) so reviewers can verify the
Vite tool chain produces a build artefact. `scripts.test` and
`scripts.test:watch` SHALL remain unchanged (`vitest run` and `vitest`
respectively).

#### Scenario: npm start invokes vite
- **WHEN** a reviewer reads `package.json`
- **THEN** the `scripts.start` value MUST be exactly `vite`
- **AND** `package.json` MUST NOT contain any script whose value is `node server.js` (the back-end has no npm wrapper)

#### Scenario: Build and preview scripts exist
- **WHEN** a reviewer reads `package.json`
- **THEN** `scripts.build` MUST be exactly `vite build`
- **AND** `scripts.preview` MUST be exactly `vite preview`

### Requirement: TypeScript strict mode is enabled for src/

The frontend SHALL declare a `tsconfig.json` at the repository root whose
compiler options include `"strict": true` and whose `include` array covers
`src` (or `src/**/*`). The back-end SHALL remain in JavaScript and SHALL
NOT be included in this `tsconfig.json`.

#### Scenario: tsconfig.json sets strict and scopes to src
- **WHEN** a reviewer reads `tsconfig.json`
- **THEN** `compilerOptions.strict` MUST be `true`
- **AND** the `include` array MUST contain an entry that matches `src/**/*` (e.g. exactly `"src"` or `"src/**/*"`)
- **AND** the `include` array MUST NOT contain `server.js` or `server` or `tests`

### Requirement: Constitution documents are kept consistent with the new npm script semantics

The documentation in `docs/roadmap.md` and `CLAUDE.md` SHALL be kept
consistent with the new `npm start = vite` semantics. Specifically,
`docs/roadmap.md` phase #4 verification command SHALL refer to `npm start`
(not `npm run dev`), and `CLAUDE.md` §"Running the project" SHALL describe
`npm start` as the front-end Vite command and SHALL describe the back-end
launch as `node server.js` (without any npm wrapper).

#### Scenario: docs/roadmap.md phase #4 references npm start
- **WHEN** a reviewer reads the phase #4 row of the table in `docs/roadmap.md`
- **THEN** the verification column MUST contain the substring `npm start`
- **AND** that row MUST NOT contain the substring `npm run dev`

#### Scenario: CLAUDE.md Running the project section describes the split
- **WHEN** a reviewer reads `CLAUDE.md` §"Running the project"
- **THEN** that section MUST describe `npm start` as launching the front-end Vite dev server
- **AND** that section MUST describe the back-end launch as `node server.js` directly (without any npm script alias)
