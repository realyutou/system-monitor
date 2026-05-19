## Why

`docs/roadmap.md` 階段 1 要求落地第一個會跑的後端：一個 `/healthz` endpoint。`docs/tech-stack.md` 明確把「HTTP 框架選擇」延後到本階段才敲定，所以這個 change 同時要 (a) 寫出 reviewer 能用 `curl localhost:3001/healthz` 驗證的最小 server，並 (b) 在實作中把框架選定為 `node:http`，關掉 `tech-stack.md` 的這個未決項。

## What Changes

- 新增專案根目錄的 `package.json`（`"type": "module"`、`start` / `test` scripts、devDeps `vitest` + `supertest`）。
- 新增 `server.js`：匯出 `createServer()` 工廠與 `PORT = 3001` 常數，僅在以 main module 執行（`node server.js`）時 listen。
- 新增 `tests/server/healthz.test.js`：Supertest 對 `createServer()` 發 `GET /healthz`，斷言 200 + body deep-equal `{ status: 'ok' }` + `Content-Type: application/json`。
- 視需要新增 `vitest.config.js`（最小設定 `{ test: { environment: 'node' } }`）；若預設 glob 已足夠則略過。
- 更新 `docs/tech-stack.md`：把 Backend §HTTP 框架 由「待 roadmap 階段 1 敲定」改為 `node:http`，並補一則「為何不選 Express / Fastify」取捨記錄。
- **鎖定的決策**：HTTP 框架 = `node:http`；後端語言 = 純 JavaScript（ESM）；repo 形狀 = 單一 root `package.json`；port = 硬寫 `3001` 常數（env 覆寫留到 roadmap 階段 6）。
- **非變更**：本 change 不做任何 CPU / Memory / Disk metric route，不引入 `systeminformation`、React、Vite、Recharts；那些屬於後續階段。

## Capabilities

### New Capabilities
- `backend-server`: 後端 Node HTTP server 與其暴露的 endpoint 合約（從本階段的 `/healthz` 起算，後續階段在同一 capability 下新增 metric 相關 requirement）。

### Modified Capabilities
<!-- 無：本 change 不改動任何既存 capability 的 requirements。`project-constitution` 的內容不變；`docs/tech-stack.md` 內 HTTP 框架欄位的填寫屬於文件層級調整，不涉及 spec-level requirement 變更。 -->

## Impact

- **新增檔案**：`package.json`、`package-lock.json`、`server.js`、`tests/server/healthz.test.js`、（可能）`vitest.config.js`、（可選）`.nvmrc`。
- **既有檔案修改**：`docs/tech-stack.md`（Backend §HTTP 框架 + §取捨記錄）。
- **新增 npm 相依**：`vitest`、`supertest`（皆為 devDependencies）；無 runtime 相依。
- **流程影響**：reviewer 之後可執行 `npm test -- healthz`（一個綠燈測試）與 `node server.js` + `curl -s localhost:3001/healthz`（回 `{"status":"ok"}`）兩條驗證指令，對應 `docs/roadmap.md` 階段 1 欄位。
- **解鎖**：後續 roadmap 階段 2/3（metric API）可在同一 `backend-server` capability 下擴充，並直接重用 `createServer()` 工廠。
