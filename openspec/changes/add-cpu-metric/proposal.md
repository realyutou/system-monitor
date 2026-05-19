## Why

`docs/roadmap.md` 階段 2 要求在 phase #1 落地的 `node:http` server 上新增第一條系統指標路由：`GET /api/metrics/cpu`。本 change 同時落實 `docs/tech-stack.md` §資料來源中已釘為「首選」的 `systeminformation`——這是 repo 第一次引入 runtime npm 相依，目的是把「`systeminformation` 在本機 Node 20 上能否穩定回傳 CPU 採樣」從紙上決策變成可驗證的事實。

## What Changes

- 新增 `tests/server/cpu.test.js`：Supertest 對 `createServer()` 發 `GET /api/metrics/cpu`，斷言 200 + JSON body 含 `usagePercent: number ∈ [0, 100]`、`cores: integer ≥ 1`、`timestamp: ISO 8601 string`；測試先 fail。
- 修改 `server.js`：在 `createServer()` 既有 request handler 內新增 `GET /api/metrics/cpu` 分支；以 `try/catch` 包住 `systeminformation.currentLoad()`，成功回 200 + DTO，失敗回 500 + `{ error: 'cpu sample failed' }`。
- Refactor 階段在 `server.js` 內抽出零引數 `async function readCpu()`，handler 改為呼叫它組裝 response。
- 新增 `package.json` 的 `dependencies` 區塊，加入 `"systeminformation": "^5"`（repo 首次出現 runtime dependency）。
- **鎖定的決策**：`usagePercent` = `currentLoad().currentLoad`；`cores` = `currentLoad().cpus.length`；`timestamp` = handler 內 `new Date().toISOString()`；採集失敗 → 500 + JSON envelope；`readCpu()` 為零引數 wrapper（不接受 sampler 注入）。
- **非變更**：本 change 不做 memory / disk endpoint（roadmap phase #3）、不抽 `metricsRouter`（phase #3 Refactor）、不引入 fixture 注入（phase #8）、不更動 `docs/tech-stack.md`（資料來源欄位已預寫）。

## Capabilities

### New Capabilities
<!-- 無：本 change 不引入新 capability。CPU 指標屬於既有 `backend-server` capability 的擴充。 -->

### Modified Capabilities
- `backend-server`: 新增 Requirement「CPU metric endpoint returns systeminformation snapshot」（含成功與失敗兩個 scenario），以及 Requirement「CPU sampling is encapsulated in a pure helper」（針對 `readCpu()` 與 HTTP 解耦）。

## Impact

- **新增檔案**：`tests/server/cpu.test.js`、`openspec/changes/add-cpu-metric/{proposal.md, design.md, tasks.md, specs/backend-server/spec.md}`。
- **既有檔案修改**：`server.js`（新增 CPU route + `readCpu()`）、`package.json` / `package-lock.json`（新增 runtime dep）。
- **新增 npm 相依**：`systeminformation`（^5，runtime dependency；repo 第一個 runtime dep）。
- **流程影響**：reviewer 之後可執行 `npm test -- cpu` 與 `curl -s localhost:3001/api/metrics/cpu | jq` 兩條驗證指令，對應 `docs/roadmap.md` 階段 2 欄位。
- **解鎖**：roadmap phase #3（memory + disk metric API）可在 `server.js` 內 mirror 本階段的 route + helper 模式，並在 Refactor 步驟把三條 metric route 收斂進 `metricsRouter`。
