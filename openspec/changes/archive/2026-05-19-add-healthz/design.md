## Context

本 change 是 `system-monitor` 第一段執行碼，也是 `docs/roadmap.md` 階段 1 的落地。在此之前：

- repo 只有 `docs/` 三份憲法與一個 `project-constitution` capability，沒有 `package.json`、沒有 test runner、沒有任何 Node entry point。
- `docs/tech-stack.md` 把後端 HTTP 框架欄位明文留白：「待 roadmap 階段 1 敲定」。所以這個 change 同時兼具「實作」與「決策關閉」兩種角色。
- `BACKGROUND.md` 規定 reviewer 會跑 `node server.js` 與 `npm start` 兩條指令；`docs/roadmap.md` 階段 1 的驗證指令是 `npm test -- healthz` 全綠 + `curl -s localhost:3001/healthz` 回 `{"status":"ok"}`。

約束：

- TDD 強制（`docs/mission.md` §品質原則）：先寫會 fail 的 Supertest，再寫實作。
- 效能預算：本機單一 API < 100ms（`docs/tech-stack.md` §效能預算）；`/healthz` 不採集任何系統資料，遠低於預算。
- 不可預先承諾後續階段需要但本階段不需要的東西（例如 CORS、env-overridable port、graceful shutdown）。

## Goals / Non-Goals

**Goals:**

- 提供 `GET /healthz` → 200 + JSON `{ "status": "ok" }` + `Content-Type: application/json`。
- `server.js` 以 `createServer()` 工廠輸出 `http.Server`，使 Supertest 可在不綁 port 的情況下測試。
- 鎖定後端 HTTP 框架為 `node:http`（內建），把 `docs/tech-stack.md` 的對應欄位由「未決」改為「已決 + 取捨記錄」。
- 建立單一 root `package.json`（ESM）、`vitest` + `supertest` devDeps、`start` / `test` 兩條 npm script。
- 讓 reviewer 兩條驗證指令第一次可以執行：`npm test -- healthz` 與 `node server.js` + `curl localhost:3001/healthz`。

**Non-Goals:**

- 不引入任何 runtime npm 相依（含 `express`、`fastify`、`systeminformation`）。
- 不寫 CPU / Memory / Disk metric endpoint（roadmap 階段 2 / 3）。
- 不引入 env 變數覆寫 PORT（roadmap 階段 6 一起做）。
- 不寫 CORS、middleware 抽象、graceful shutdown、結構化 logging、request id。
- 不引入前端任何檔案（roadmap 階段 4 開始）。
- 不為 404 path 設計通用錯誤中介層；本階段只需「不是 /healthz 就回 404 JSON」這個最小行為。

## Decisions

### 1. HTTP 框架 = `node:http`（內建）

**選擇**：直接使用 Node 內建 `node:http`。

**為何**：

- 0 個 runtime 相依，與本專案「自己用 Node.js 採集、自己畫圖」的展示重點一致（`docs/tech-stack.md` §取捨記錄）。
- 對 `/healthz` + 後續三條 metric route 而言，路由就是「method + url 的 if/else」，引入框架反而增加被讀者追問的面積。
- Supertest 接受 `http.Server` 物件或 request listener；不需要任何 adapter。

**替代方案考慮**：

- **Fastify**：現代、有型別、schema 驗證內建。但本專案後端 JS 不上 TS，型別優勢用不到；且引入它意味著 reviewer 也要記得它的 plugin 流程。
- **Express**：reviewer 熟悉度最高，但 2026 年的 portfolio piece 用 Express 看起來像懷舊選擇；middleware 慣例對本專案太重。
- 兩者皆視為「未來如果路由規模真的擴大再考慮」，並在 `docs/tech-stack.md` §取捨記錄補一則理由。

### 2. `createServer()` 工廠分離 listen 與構建

**選擇**：`server.js` 匯出 `createServer()`，回傳 `http.Server`；只有在以 main module 執行時才 `listen(PORT)`。

**為何**：

- Supertest 的最佳用法就是直接傳入未 listen 的 `http.Server`，不必選一個沒被佔用的 port，也不必在 test 後 `close()`。
- `docs/roadmap.md` 階段 1 的 Refactor 步驟本來就要求做這件事；既然我們知道要做，那就直接設計在 Green 階段。
- main module 偵測使用 ESM 慣用法：`process.argv[1] === fileURLToPath(import.meta.url)`，不依賴 CommonJS 的 `require.main`。

**替代方案考慮**：

- 在 test 內 `server.listen(0)`（隨機 port）。可行，但每支 test 都要 `close()`，引入不必要的非同步收尾。
- 把 handler 抽成獨立函式、不回傳 `http.Server`。可行，但失去「Supertest 直接吃 server 物件」的整潔感。

### 3. 路由：單一 handler 的 method+url dispatch

**選擇**：`createServer((req, res) => { ... })` 內以 `if (req.method === 'GET' && req.url === '/healthz')` 做路由；其他一律 `404 { error: 'not found' }`。

**為何**：

- 本階段只有一條路由，不需要 router 抽象。
- 階段 2 / 3 新增 metric route 時才會抽 `metricsRouter`（roadmap 階段 3 的 Refactor 已寫死這件事）；現在抽會做出沒有對應 requirement 的代碼。

**替代方案考慮**：先建一個 trivial router map。被否決，理由是違反「最小實作」原則，且 Phase 3 會自然產生一次抽象的好時機。

### 4. 回應形狀

- Status: 200。
- Headers: `Content-Type: application/json` 顯式設定（避免依賴 `res.json`-like 方便函式，因為我們沒框架）。
- Body: `JSON.stringify({ status: 'ok' })`。Supertest 解析後 `res.body` 會 deep-equal `{ status: 'ok' }`。

不在 body 加 `timestamp` / `uptime` / `version`：這些屬於健康檢查「進階」欄位，本階段沒有 requirement，也尚未被 spec scenario 覆蓋；加了就要再寫對應測試。

### 5. PORT 常數位置

**選擇**：`server.js` 匯出 `export const PORT = 3001`。

**為何**：roadmap 階段 6 才把 polling 間隔等配置抽到 `src/config.ts`；在那之前後端只有這一個 magic number，從 `server.js` 出口最直接。Refactor task 會 grep `3001` 確認沒有重複。

### 6. 測試檔位置：`tests/server/healthz.test.js`

**選擇**：頂層 `tests/` 目錄，下分 `server/`（與將來的 `web/`、`fixtures/` 平行）。

**為何**：

- Phase 8 已預定 `tests/fixtures/`；現在直接把所有測試資產收在 `tests/` 樹下，未來不需要搬家。
- Vitest 預設 glob（`**/*.{test,spec}.{js,mjs,cjs,ts,tsx,jsx}`）會自動撿到，所以 `vitest.config.js` 在本階段非必要；若要顯式設定，僅放 `{ test: { environment: 'node' } }`（避免將來新增前端測試時意外切到 happy-dom）。

### 7. TDD 紀律：commit 順序

**選擇**：先 commit 「failing test」，再 commit 「實作 + test 變綠」。允許兩個變更同一 PR；不允許「實作先進，測試後補」。

**為何**：`docs/mission.md` §品質原則 把 TDD 列為強制；單看 `git log` 也要能看到 red→green 的痕跡。

### 8. 何時更新 `docs/tech-stack.md`

**選擇**：在實作的 Green / Refactor 完成、`/healthz` 跑得起來之後，再修文件（task 5.3）。

**為何**：避免在實作前就單方面修文件造成「文件聲稱已決定但 code 還沒落地」的不一致狀態。

## Risks / Trade-offs

- **[Risk]** `node:http` 沒有自動 body parser / 路由表，將來新增 metric route 時手寫 dispatch 可能變雜亂 → **Mitigation**：roadmap 階段 3 的 Refactor 已預告會抽 `metricsRouter`，到時統一處理。本階段只需確保 dispatch 邏輯放在 `createServer()` 內，未來易抽。
- **[Risk]** Supertest 與 ESM 整合在 Vitest 中偶有 import 解析問題 → **Mitigation**：使用 `import request from 'supertest'`（CJS default export 自動轉換）；如失敗，加 `vitest.config.js` 內 `test.deps.inline = ['supertest']`。
- **[Risk]** Reviewer 系統的 port 3001 被佔用 → **Mitigation**：本階段不引入 env 覆寫；若衝突，文件指引以 `lsof -i :3001` 排查。將來 roadmap 階段 6 會解決。
- **[Trade-off]** 不引入框架 → 失去 middleware 生態。對 demo 範圍而言可接受；若未來需要 auth 或 rate limiting（明確列在 `mission.md` 非目標中），再評估。
- **[Trade-off]** 後端維持 JS 不上 TS → 失去前後端共享 DTO 型別的可能。為了讓 `node server.js` 直接可跑（無 transpile）的承諾，本階段刻意接受。

## Migration Plan

不適用。本 change 是新增；無既有功能需要遷移或回滾。若需撤回：刪除 `add-healthz` 中所列新增檔案、還原 `docs/tech-stack.md` 的 HTTP 框架欄位即可。

## Open Questions

- 是否需要在本階段加入 `engines.node` 欄位於 `package.json`（鎖 Node 20+）？**傾向加**，與 `docs/tech-stack.md` Backend §Runtime 一致。將在 task 1.1 落實。
- 是否需要 `.nvmrc` 檔案？**選擇性**；若 reviewer 使用 `nvm` 會很方便。task 1 末尾依需要決定，不形成 spec requirement。
- `vitest.config.js` 是否真的要寫？**設計傾向**：本階段先省略，靠預設 glob 即可；若 `npm test -- healthz` 抓不到 spec name，再補上最小 config。屬實作期決策，不需提案。
