## ADDED Requirements

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
