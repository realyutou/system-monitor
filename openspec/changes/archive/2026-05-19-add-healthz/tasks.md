## 1. Scaffold root package.json

- [x] 1.1 在 repo root 建立 `package.json`，欄位包含 `"name": "system-monitor"`、`"private": true`、`"type": "module"`、`"engines": { "node": ">=20" }`
- [x] 1.2 加入 scripts：`"start": "node server.js"`、`"test": "vitest run"`、`"test:watch": "vitest"`
- [x] 1.3 加入 devDependencies：`vitest`（^1）、`supertest`（^6）
- [x] 1.4 執行 `npm install`，產生 `package-lock.json`；確認 `node_modules/` 已被 `.gitignore` 排除

## 2. 🔴 Red：寫一支會 fail 的 Supertest

- [x] 2.1 建立目錄 `tests/server/`
- [x] 2.2 建立 `tests/server/healthz.test.js`，`import request from 'supertest'`、`import { createServer } from '../../server.js'`
- [x] 2.3 撰寫 case：`GET /healthz` 回 `status === 200`、`body deep-equal { status: 'ok' }`、`headers['content-type']` 含 `application/json`
- [x] 2.4 補一支 case：`GET /does-not-exist` 回 `status === 404`，且 body 是含 `error` 欄位的 JSON 物件
- [x] 2.5 執行 `npm test -- healthz`，親眼確認測試 fail（找不到 `server.js`）——此為 Red 狀態；commit 訊息標註 `stage 1 (red): failing healthz test`

## 3. 🟢 Green：以 `node:http` 實作最小 server

- [x] 3.1 建立 `server.js`，`import http from 'node:http'`、`import { fileURLToPath } from 'node:url'`
- [x] 3.2 匯出 `export const PORT = 3001`
- [x] 3.3 匯出 `createServer()`：回傳 `http.createServer((req, res) => ...)`，`GET /healthz` 寫 200 + `Content-Type: application/json` + `JSON.stringify({ status: 'ok' })`；其他 method+url 寫 404 + 同樣 Content-Type + `JSON.stringify({ error: 'not found' })`
- [x] 3.4 在檔尾用 `if (process.argv[1] === fileURLToPath(import.meta.url)) { createServer().listen(PORT, () => console.log(...)) }` 守住 listen，使 `import` 不會綁 port
- [x] 3.5 執行 `npm test -- healthz`，確認測試綠燈；commit 訊息標註 `stage 1 (green): /healthz returns 200 ok via node:http`

## 4. ♻️ Refactor

- [x] 4.1 確認 `createServer()` 是 server 物件唯一構建點（main path 與 test path 都走它）
- [x] 4.2 `grep -rn "3001" .`（排除 `node_modules`、`docs/`、`.git`）只在 `server.js` 出現一次
- [x] 4.3 啟動 log 訊息單行清楚：`Server listening on http://localhost:${PORT}`
- [x] 4.4 再跑一次 `npm test`，仍為綠燈

## 5. 驗證（對照 `docs/roadmap.md` 階段 1）

- [x] 5.1 `npm test -- healthz` 退出碼為 0 且至少一個 case 通過
- [x] 5.2 開一個 shell 跑 `node server.js`；另一個 shell 跑 `curl -s localhost:3001/healthz`，輸出必須完全等於 `{"status":"ok"}`
- [x] 5.3 更新 `docs/tech-stack.md`：把 Backend §HTTP 框架 的「待 roadmap 階段 1 敲定」改為「`node:http`（2026-05-19 在 `add-healthz` change 中敲定）」，並在 §取捨記錄 增補一則「為何不選 Express / Fastify」的 2–3 句說明

## 6. openspec hygiene

- [x] 6.1 `openspec validate add-healthz` 通過
- [x] 6.2 `openspec status --change add-healthz` 顯示所有 artifact `done`、所有 task `[x]`
- [x] 6.3 暫不執行 `/opsx:archive`：等 reviewer 確認 Phase 1 已過再 archive，避免在驗證前把 delta 併入主 spec
