## 1. 加 runtime dependency

- [x] 1.1 在 `package.json` 新增 `"dependencies"` 區塊（若不存在），加入 `"systeminformation": "^5"`
- [x] 1.2 執行 `npm install`，更新 `package-lock.json`；確認 `node_modules/systeminformation/` 存在
- [x] 1.3 跑一次 `node --input-type=module -e "import('systeminformation').then(si => si.currentLoad()).then(l => console.log(JSON.stringify({ currentLoad: l.currentLoad, coreCount: l.cpus.length })))"`，肉眼確認回傳含 `currentLoad`（0–100 範圍）與 `cpus.length`

## 2. 🔴 Red：寫一支會 fail 的 Supertest

- [x] 2.1 建立 `tests/server/cpu.test.js`，`import request from 'supertest'`、`import { createServer } from '../../server.js'`
- [x] 2.2 case A：`GET /api/metrics/cpu` 回 200、`Content-Type` 含 `application/json`、`res.body` 含 `usagePercent: expect.any(Number)` / `cores: expect.any(Number)` / `timestamp: expect.any(String)`
- [x] 2.3 case B：`res.body.usagePercent` 必須 `>= 0` 且 `<= 100`
- [x] 2.4 case C：`res.body.cores` 必須 `>= 1` 且 `Number.isInteger(res.body.cores)` 為 true
- [x] 2.5 case D：`new Date(res.body.timestamp).toString() !== 'Invalid Date'`（驗證 ISO 8601 可解析）
- [x] 2.6 執行 `npm test -- cpu`，親眼確認 4 個 case 全 fail（route 不存在 → 404）
- [x] 2.7 commit，訊息標註 `stage 2 (red): failing cpu metric tests`

## 3. 🟢 Green：以 `systeminformation` 實作 handler

- [x] 3.1 在 `server.js` 頂部新增 `import * as si from 'systeminformation'`
- [x] 3.2 將 `createServer()` 內的 request listener 改為 `async (req, res) => { ... }`（既有 `/healthz` 與 404 分支行為不變）
- [x] 3.3 在 listener 內新增 `if (req.method === 'GET' && req.url === '/api/metrics/cpu') { ... return }` 分支，置於 `/healthz` 分支之後、404 fallback 之前
- [x] 3.4 分支內以 `try { const load = await si.currentLoad(); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ usagePercent: load.currentLoad, cores: load.cpus.length, timestamp: new Date().toISOString() })) } catch (err) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'cpu sample failed' })) }`
- [x] 3.5 執行 `npm test`，cpu 4 個 case 與既有 healthz 全部綠燈
- [x] 3.6 commit，訊息標註 `stage 2 (green): GET /api/metrics/cpu returns systeminformation payload`

## 4. ♻️ Refactor：抽 `readCpu()`

- [ ] 4.1 在 `server.js` 內（與 `createServer` 同檔，不另開檔案）新增 `async function readCpu() { const load = await si.currentLoad(); return { usagePercent: load.currentLoad, cores: load.cpus.length, timestamp: new Date().toISOString() }; }`
- [ ] 4.2 將 CPU 分支的 try 區塊改為 `const dto = await readCpu(); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(dto));`
- [ ] 4.3 `grep -n "currentLoad" server.js` 應只在 `readCpu()` 內出現一次（CPU 分支不再直接呼叫 `si.currentLoad`）
- [ ] 4.4 確認 `readCpu()` 內部完全不依賴 `req` / `res` / `http.*`（純資料函式）
- [ ] 4.5 再跑一次 `npm test`，仍為綠燈
- [ ] 4.6 commit，訊息標註 `stage 2 (refactor): extract readCpu() helper`

## 5. 驗證（對照 `docs/roadmap.md` 階段 2）

- [ ] 5.1 `npm test -- cpu` 退出碼為 0 且 4 個 case 通過
- [ ] 5.2 `npm test` 全部綠燈（healthz + cpu）
- [ ] 5.3 開一個 shell 跑 `node server.js`；另一個 shell 跑 `curl -s localhost:3001/api/metrics/cpu | jq`，輸出必須含 `usagePercent`、`cores`、`timestamp` 三欄且 `usagePercent` 落在 0–100
- [ ] 5.4 跑 `curl -s -o /dev/null -w '%{time_total}\n' localhost:3001/api/metrics/cpu`，確認單次 round-trip < 0.1 秒（< 100ms 預算）
- [ ] 5.5 順便跑 `curl -s localhost:3001/healthz`，確認 `/healthz` 仍回 `{"status":"ok"}`（未被破壞）

## 6. openspec hygiene

- [ ] 6.1 `openspec validate add-cpu-metric` 退出碼 0
- [ ] 6.2 `openspec status --change add-cpu-metric` 顯示所有 artifact `done`、所有 task `[x]`
- [ ] 6.3 暫不執行 `/opsx:archive`；等 reviewer 確認 phase 2 通過再 archive，避免在驗證前把 delta 併入主 spec
