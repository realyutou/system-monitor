# backend-server Specification

## Purpose
TBD - created by archiving change add-healthz. Update Purpose after archive.
## Requirements
### Requirement: Healthz endpoint returns ok

The backend SHALL expose `GET /healthz` returning HTTP 200 with a JSON body
`{ "status": "ok" }` and `Content-Type: application/json`, so reviewers and
uptime probes can confirm the server is up.

#### Scenario: Server responds to /healthz with 200 ok
- **WHEN** a client sends `GET /healthz` to the running server
- **THEN** the response status MUST be `200`
- **AND** the response body MUST deep-equal `{ "status": "ok" }`
- **AND** the response `Content-Type` header MUST be `application/json`

#### Scenario: Unknown route returns 404 json
- **WHEN** a client sends `GET /does-not-exist` to the running server
- **THEN** the response status MUST be `404`
- **AND** the response body MUST be a JSON object containing an `error` field

### Requirement: createServer factory is importable without binding a port

The backend SHALL expose a `createServer()` factory from `server.js` that
returns an `http.Server` instance, so tests can drive it via Supertest
without occupying a real port and without asynchronous teardown.

#### Scenario: Importing createServer does not start listening
- **WHEN** a test module imports `createServer` from `server.js`
- **THEN** the import MUST NOT cause the process to listen on any port
- **AND** the import MUST NOT print any startup log

#### Scenario: createServer returns a usable http.Server
- **WHEN** a test calls `createServer()`
- **THEN** the returned object MUST be an instance of `http.Server`
- **AND** Supertest MUST be able to issue requests against it without `listen` being called

### Requirement: Running server.js directly binds port 3001

The `server.js` entry point SHALL bind to TCP port `3001` when executed as the main module (`node server.js`), so reviewers can run the verification command from `docs/roadmap.md` Phase 1 unchanged.

#### Scenario: Reviewer runs node server.js and probes /healthz
- **WHEN** a reviewer runs `node server.js`
- **THEN** the process MUST begin listening on `127.0.0.1:3001` (or the wildcard equivalent)
- **AND** `curl -s localhost:3001/healthz` MUST return the exact string `{"status":"ok"}` followed by no additional body

#### Scenario: Importing server.js as a module does NOT bind the port
- **WHEN** another module imports from `server.js` (without executing it as the main module)
- **THEN** port `3001` MUST remain unbound by this import

### Requirement: CPU metric endpoint returns systeminformation snapshot

The backend SHALL expose `GET /api/metrics/cpu` returning HTTP 200 with a JSON
body containing `usagePercent` (number in `[0, 100]`), `cores` (positive
integer), and `timestamp` (ISO 8601 string parseable by `new Date(...)`), and
`Content-Type: application/json`, so the frontend (later phases) can render
the first CPU chart from a single fetch and reviewers can verify the route
with `curl ... | jq`.

#### Scenario: Server returns a valid CPU snapshot
- **WHEN** a client sends `GET /api/metrics/cpu` to the running server
- **THEN** the response status MUST be `200`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST contain `usagePercent` as a number with `usagePercent >= 0` and `usagePercent <= 100`
- **AND** the response body MUST contain `cores` as an integer with `cores >= 1`
- **AND** the response body MUST contain `timestamp` as a string parseable by `new Date(timestamp)` (ISO 8601), with the parsed `Date` not being `Invalid Date`

#### Scenario: Sampling failure surfaces as 500 with json envelope
- **WHEN** the underlying CPU sampling call (`systeminformation.currentLoad()`) throws
- **THEN** the response status MUST be `500`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST be a JSON object containing an `error` field of type string

### Requirement: CPU sampling is encapsulated in a pure helper

The backend SHALL expose the CPU sampling + DTO mapping as a parameterless
async function named `readCpu()` inside `server/metricsRouter.js`, so the HTTP
handler stays thin and future phases can replace the helper with
fixture-driven data without touching request/response code.

#### Scenario: readCpu returns a DTO without HTTP coupling
- **WHEN** test code calls `readCpu()` directly (without going through an HTTP request)
- **THEN** the returned value MUST be an object with the fields `usagePercent`, `cores`, and `timestamp`
- **AND** the function signature MUST take zero parameters
- **AND** the function body MUST NOT reference any `req`, `res`, or `http.*` symbols

### Requirement: Memory metric endpoint returns systeminformation snapshot

The backend SHALL expose `GET /api/metrics/memory` returning HTTP 200 with a JSON
body containing `usedBytes` (integer ≥ 0), `totalBytes` (integer ≥ 1),
`usagePercent` (number in `[0, 100]`), and `Content-Type: application/json`, so
the frontend (later phases) can render the memory chart from a single fetch and
reviewers can verify the route with `curl ... | jq`. The `usedBytes` value MUST
correspond to "real working set" memory (excluding reclaimable buffer / cache),
so reviewers comparing the dashboard to `Activity Monitor` (macOS) or `htop`
(Linux) see consistent numbers.

#### Scenario: Server returns a valid memory snapshot
- **WHEN** a client sends `GET /api/metrics/memory` to the running server
- **THEN** the response status MUST be `200`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST contain `usedBytes` as an integer with `usedBytes >= 0`
- **AND** the response body MUST contain `totalBytes` as an integer with `totalBytes >= 1`
- **AND** the response body MUST contain `usagePercent` as a number with `usagePercent >= 0` and `usagePercent <= 100`
- **AND** the response body MUST satisfy `usedBytes <= totalBytes`

#### Scenario: Memory sampling failure surfaces as 500 with json envelope
- **WHEN** the underlying memory sampling call (`systeminformation.mem()`) throws
- **THEN** the response status MUST be `500`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST be a JSON object containing an `error` field of type string

### Requirement: Disk metric endpoint returns filtered mounts

The backend SHALL expose `GET /api/metrics/disk` returning HTTP 200 with a JSON
body of shape `{ mounts: Array<{ fs: string, usedBytes: integer ≥ 0, totalBytes: integer ≥ 1, usagePercent: number ∈ [0, 100] }> }`
and `Content-Type: application/json`, so the frontend (later phases) can render
per-mount disk usage. The `mounts[]` array MUST exclude entries whose filesystem
type (compared case-insensitively) is not one of
`{apfs, ext4, ext3, ext2, xfs, btrfs, zfs, ntfs, vfat, exfat}`,
entries with reported size `0`, and entries whose mount path begins with
`/System/Volumes/` (macOS firmlink / snapshot pseudo-mounts), so reviewers see
only real persistent storage devices.

#### Scenario: Server returns a valid disk snapshot with at least one mount
- **WHEN** a client sends `GET /api/metrics/disk` to the running server on a workstation with at least one real persistent storage volume
- **THEN** the response status MUST be `200`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST contain `mounts` as an array with `mounts.length >= 1`
- **AND** every element of `mounts` MUST contain `fs` as a non-empty string
- **AND** every element of `mounts` MUST contain `usedBytes` as an integer with `usedBytes >= 0`
- **AND** every element of `mounts` MUST contain `totalBytes` as an integer with `totalBytes >= 1`
- **AND** every element of `mounts` MUST contain `usagePercent` as a number with `usagePercent >= 0` and `usagePercent <= 100`
- **AND** every element of `mounts` MUST satisfy `usedBytes <= totalBytes`

#### Scenario: Disk filter excludes non-storage and pseudo-mounts
- **WHEN** `systeminformation.fsSize()` returns an entry whose `type` (compared case-insensitively) is not in the allowlist (`apfs / ext4 / ext3 / ext2 / xfs / btrfs / zfs / ntfs / vfat / exfat`)
- **THEN** that entry MUST NOT appear in `mounts[]`
- **AND** an entry with `size === 0` MUST NOT appear in `mounts[]`
- **AND** an entry whose `mount` path begins with `/System/Volumes/` MUST NOT appear in `mounts[]`

#### Scenario: Disk sampling failure surfaces as 500 with json envelope
- **WHEN** the underlying disk sampling call (`systeminformation.fsSize()`) throws
- **THEN** the response status MUST be `500`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST be a JSON object containing an `error` field of type string

### Requirement: Memory and Disk sampling are encapsulated in pure helpers

The backend SHALL expose memory and disk sampling + DTO mapping as parameterless
async functions named `readMemory()` and `readDisk()` inside
`server/metricsRouter.js`, mirroring the shape of `readCpu()` so the HTTP layer
stays thin and future phases (fixture injection in phase #8) can replace the
helpers without touching request / response code.

#### Scenario: readMemory returns a DTO without HTTP coupling
- **WHEN** test code calls `readMemory()` directly (without going through an HTTP request)
- **THEN** the returned value MUST be an object with the fields `usedBytes`, `totalBytes`, and `usagePercent`
- **AND** the function signature MUST take zero parameters
- **AND** the function body MUST NOT reference any `req`, `res`, or `http.*` symbols

#### Scenario: readDisk returns a DTO without HTTP coupling
- **WHEN** test code calls `readDisk()` directly (without going through an HTTP request)
- **THEN** the returned value MUST be an object with a `mounts` field of type array
- **AND** the function signature MUST take zero parameters
- **AND** the function body MUST NOT reference any `req`, `res`, or `http.*` symbols

### Requirement: Metric routes are dispatched through metricsRouter

The backend SHALL dispatch all `/api/metrics/<name>` routes through an exported
`metricsRouter(req, res)` function in `server/metricsRouter.js`. `server.js`
SHALL NOT import `systeminformation` directly after this requirement is in
effect; all `systeminformation.*` calls SHALL live inside
`server/metricsRouter.js`. The router SHALL return `true` when it has written a
response (recognised metric name) and `false` when the requested `/api/metrics/<x>`
path is unknown, in which case `server.js`'s main listener SHALL handle it via
the existing 404 envelope. The CPU endpoint behaviour and DTO defined in the
existing CPU requirements remain unchanged; only the implementation location
moves into `server/metricsRouter.js`.

#### Scenario: Known metric routes are handled by metricsRouter
- **WHEN** a client sends `GET /api/metrics/cpu`, `GET /api/metrics/memory`, or `GET /api/metrics/disk`
- **THEN** `server.js`'s listener MUST delegate to `metricsRouter(req, res)` from `server/metricsRouter.js`
- **AND** `metricsRouter` MUST write the response and return `true`
- **AND** `server.js` MUST NOT contain any `import` from the `systeminformation` package

#### Scenario: Unknown metric subpaths fall through to the 404 envelope
- **WHEN** a client sends `GET /api/metrics/does-not-exist`
- **THEN** `metricsRouter(req, res)` MUST return `false` without writing a response
- **AND** `server.js`'s main listener MUST then respond with HTTP `404`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST be a JSON object containing an `error` field of type string

#### Scenario: Sampling errors surface as a unified 500 envelope
- **WHEN** the helper for any metric (`readCpu` / `readMemory` / `readDisk`) throws inside `metricsRouter`
- **THEN** the response status MUST be `500`
- **AND** the response `Content-Type` header MUST be `application/json`
- **AND** the response body MUST be a JSON object whose `error` field is a string mentioning the failing metric (matching the pattern `<metric> sample failed`, where `<metric>` is `cpu` / `memory` / `disk`)

#### Scenario: Importing metricsRouter does not start listening or print logs
- **WHEN** a test module imports from `server/metricsRouter.js`
- **THEN** the import MUST NOT cause the process to listen on any port
- **AND** the import MUST NOT print any startup log
- **AND** the existing `createServer()` import-time guarantee from `server.js` MUST remain satisfied (no listen, no log on import)

