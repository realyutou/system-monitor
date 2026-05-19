## ADDED Requirements

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
async function named `readCpu()` inside `server.js`, so the HTTP handler stays
thin and future phases can replace the helper with fixture-driven data
without touching request/response code.

#### Scenario: readCpu returns a DTO without HTTP coupling
- **WHEN** test code calls `readCpu()` directly (without going through an HTTP request)
- **THEN** the returned value MUST be an object with the fields `usagePercent`, `cores`, and `timestamp`
- **AND** the function signature MUST take zero parameters
- **AND** the function body MUST NOT reference any `req`, `res`, or `http.*` symbols
