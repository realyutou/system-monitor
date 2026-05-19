## ADDED Requirements

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
