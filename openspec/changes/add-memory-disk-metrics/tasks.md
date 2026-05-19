## 1. 🔴 Red：寫兩支會 fail 的 Supertest

- [x] 1.1 建立 `tests/server/memory.test.js`，`import request from 'supertest'`、`import { createServer } from '../../server.js'`
- [x] 1.2 memory case A：`GET /api/metrics/memory` 回 200、`Content-Type` 含 `application/json`、`res.body` 含 `usedBytes: expect.any(Number)` / `totalBytes: expect.any(Number)` / `usagePercent: expect.any(Number)`
- [x] 1.3 memory case B：`Number.isInteger(res.body.usedBytes)` 與 `Number.isInteger(res.body.totalBytes)` 皆為 true；兩者 `>= 0`；`totalBytes >= 1`
- [x] 1.4 memory case C：`res.body.usagePercent >= 0` 且 `<= 100`
- [x] 1.5 memory case D：`res.body.usedBytes <= res.body.totalBytes`
- [x] 1.6 建立 `tests/server/disk.test.js`，同樣 import
- [x] 1.7 disk case A：`GET /api/metrics/disk` 回 200、`Content-Type` 含 `application/json`、`Array.isArray(res.body.mounts)` 為 true、`res.body.mounts.length >= 1`
- [x] 1.8 disk case B：每個 `mount` 含 `fs: expect.any(String)`、`usedBytes` / `totalBytes` 為整數、`usagePercent` 為數字
- [x] 1.9 disk case C：每個 `mount` 的 `usagePercent ∈ [0, 100]`、`usedBytes <= totalBytes`、`fs` 不為空字串
- [x] 1.10 disk case D：`res.body.mounts` 中沒有任何 `mount.fs` 帶有 `/System/Volumes/` 字串（負面驗證 filter 規則；註：filter 是過濾 `mount` path 而非 `fs`，但 macOS firmlink 的 `fs` 也通常包含該前綴，可作為輔助斷言；若不穩定改為 `expect.not.stringContaining` 或移除）
- [x] 1.11 執行 `npm test -- memory disk`，親眼確認兩支測試全 fail（route 不存在 → 404）
- [x] 1.12 commit，訊息標註 `stage 3 (red): failing memory + disk metric tests`

## 2. 🟢 Green：在 `server.js` 內 inline 加 `/api/metrics/memory`

- [x] 2.1 在 `createServer()` listener 內 `/api/metrics/cpu` 分支之後、404 fallback 之前新增 `if (req.method === 'GET' && req.url === '/api/metrics/memory') { ... return }` 分支
- [x] 2.2 分支內 `try { const m = await si.mem(); const usedBytes = m.active; const totalBytes = m.total; const usagePercent = (m.active / m.total) * 100; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ usedBytes, totalBytes, usagePercent })); } catch { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'memory sample failed' })); }`
- [x] 2.3 執行 `npm test -- memory`，4 個 case 全綠
- [x] 2.4 執行 `npm test`，healthz / cpu / memory 全綠（無 regression）
- [x] 2.5 commit，訊息標註 `stage 3 (green/memory): GET /api/metrics/memory returns systeminformation payload`

## 3. 🟢 Green：在 `server.js` 內 inline 加 `/api/metrics/disk`

- [x] 3.1 在 memory 分支之後、404 fallback 之前新增 `if (req.method === 'GET' && req.url === '/api/metrics/disk') { ... return }` 分支
- [x] 3.2 在 `server.js` top-level 新增 `const FS_TYPES = new Set(['apfs', 'ext4', 'ext3', 'ext2', 'xfs', 'btrfs', 'zfs', 'ntfs', 'vfat', 'exfat']);`
- [x] 3.3 分支內 `try { const fs = await si.fsSize(); const mounts = fs.filter((m) => FS_TYPES.has(m.type?.toLowerCase()) && m.size > 0 && !m.mount.startsWith('/System/Volumes/')).map((m) => ({ fs: m.fs, usedBytes: m.used, totalBytes: m.size, usagePercent: m.use })); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ mounts })); } catch { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'disk sample failed' })); }` — `m.type?.toLowerCase()` 以涵蓋 macOS 大寫 type
- [x] 3.4 執行 `npm test -- disk`，4 個 case 全綠
- [x] 3.5 執行 `npm test`，healthz / cpu / memory / disk 全綠（無 regression）
- [x] 3.6 commit，訊息標註 `stage 3 (green/disk): GET /api/metrics/disk returns filtered fsSize mounts`

## 4. ♻️ Refactor：抽 `server/metricsRouter.js` 並統一錯誤格式

- [x] 4.1 建立 `server/` 子目錄與 `server/metricsRouter.js`；在新檔頂部 `import * as si from 'systeminformation'`
- [x] 4.2 把 `server.js` 內的 `readCpu()` 整個搬到 `server/metricsRouter.js`（行為不變，仍是 zero-arg async）
- [x] 4.3 在 `server/metricsRouter.js` 新增 zero-arg `async function readMemory()`，內容對應 §2.2（從 `server.js` 搬移後改為 helper 形式）
- [x] 4.4 在 `server/metricsRouter.js` 新增 zero-arg `async function readDisk()`，內容對應 §3.3（包含 `FS_TYPES` 常數一併搬入）
- [x] 4.5 在 `server/metricsRouter.js` 新增 `const HANDLERS = { cpu: readCpu, memory: readMemory, disk: readDisk };` 與 `export async function metricsRouter(req, res) { if (req.method !== 'GET' || !req.url?.startsWith('/api/metrics/')) return false; const name = req.url.slice('/api/metrics/'.length); const handler = HANDLERS[name]; if (!handler) return false; try { const dto = await handler(); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(dto)); } catch { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: \`${name} sample failed\` })); } return true; }`
- [x] 4.6 在 `server.js` 頂部新增 `import { metricsRouter } from './server/metricsRouter.js';`
- [x] 4.7 在 `server.js` listener 內，於 `/healthz` 分支之後、404 fallback 之前替換為單一委派：`if (req.url?.startsWith('/api/metrics/')) { const handled = await metricsRouter(req, res); if (handled) return; }`（讓未知 `/api/metrics/<x>` fallthrough 到 404）
- [x] 4.8 從 `server.js` 移除 `import * as si from 'systeminformation'`、舊 `readCpu()` 函式、`/api/metrics/cpu` / `/api/metrics/memory` / `/api/metrics/disk` 三個 inline 分支、`FS_TYPES` 常數
- [x] 4.9 `grep -n "systeminformation" server.js` 應無任何結果
- [x] 4.10 `grep -rn "si\\.currentLoad\\|si\\.mem\\|si\\.fsSize" server.js server/` 應只在 `server/metricsRouter.js` 內各出現一次
- [x] 4.11 執行 `npm test`，healthz / cpu / memory / disk 全綠（無 regression）
- [x] 4.12 commit，訊息標註 `stage 3 (refactor): extract metricsRouter and unify error envelope`

## 5. 驗證（對照 `docs/roadmap.md` 階段 #3）

- [ ] 5.1 `npm test -- metrics` 退出碼為 0 且涵蓋 cpu / memory / disk 三條 metric 的全部 case
- [ ] 5.2 `npm test` 全部綠燈（healthz + cpu + memory + disk）
- [ ] 5.3 一個 shell 跑 `node server.js`；另一個 shell 跑 `curl -s localhost:3001/api/metrics/memory | jq`，輸出含 `usedBytes` / `totalBytes` / `usagePercent` 三欄，且 `usagePercent ∈ [0, 100]`
- [ ] 5.4 跑 `curl -s localhost:3001/api/metrics/disk | jq '.mounts | length'`，本機常見值 1–3；跑 `curl -s localhost:3001/api/metrics/disk | jq '.mounts[].fs'`，肉眼確認回傳的是真實磁碟（非 `/System/Volumes/...` 字樣）
- [ ] 5.5 跑 `curl -s -o /dev/null -w '%{time_total}\n' localhost:3001/api/metrics/disk`，確認單次 round-trip < 0.1 秒（< 100 ms 預算）；對 memory 也跑一次
- [ ] 5.6 跑 `curl -s -o /dev/null -w '%{http_code}\n' localhost:3001/api/metrics/foo`，輸出必須為 `404`（驗證 router 未黑洞未知子路徑）
- [ ] 5.7 跑 `curl -s localhost:3001/api/metrics/foo | jq`，body 必須為 `{ "error": <string> }`（驗證 envelope 一致）
- [ ] 5.8 跑 `curl -s localhost:3001/healthz` 與 `curl -s localhost:3001/api/metrics/cpu | jq`，確認 phase #1 / #2 行為未被破壞（regression smoke）
- [ ] 5.9 跑 `node --input-type=module -e "import('./server/metricsRouter.js').then(() => console.log('ok'))"`，輸出只有 `ok`，無 startup log、無 port 衝突（驗證 phase #1 spec scenario「Importing createServer does not start listening」相容）

## 6. openspec hygiene

- [ ] 6.1 `openspec validate add-memory-disk-metrics` 退出碼 0
- [ ] 6.2 `openspec status --change add-memory-disk-metrics` 顯示所有 artifact `done`、所有 task `[x]`
- [ ] 6.3 暫不執行 `/opsx:archive`；等 reviewer 確認 phase #3 通過再 archive，避免在驗證前把 delta 併入主 spec
