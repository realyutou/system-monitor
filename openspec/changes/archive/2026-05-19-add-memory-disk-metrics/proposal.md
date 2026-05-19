## Why

`docs/roadmap.md` 階段 #3 要求 mirror 階段 #2 的模式，在 `node:http` server 上補齊 `GET /api/metrics/memory` 與 `GET /api/metrics/disk` 兩條 endpoint，並在 Refactor 步首次把三條 metric route 抽進獨立 `metricsRouter` 並統一錯誤格式。這是前端骨架（phase #4）能一次串到完整三條 metric 的前置條件，也是把 phase #2 的單條 metric pattern 推到「多 metric 共用 router」這個必須的中繼。

## What Changes

- 新增 `tests/server/memory.test.js`：Supertest 對 `createServer()` 發 `GET /api/metrics/memory`，斷言 200 + JSON body `{ usedBytes: integer ≥ 0, totalBytes: integer ≥ 1, usagePercent: number ∈ [0, 100] }` 且 `usedBytes ≤ totalBytes`；測試先 fail。
- 新增 `tests/server/disk.test.js`：Supertest 對 `createServer()` 發 `GET /api/metrics/disk`，斷言 200 + JSON body `{ mounts: Array<{ fs, usedBytes, totalBytes, usagePercent }> }`、`mounts.length ≥ 1`、每個 mount 的欄位型別與範圍同 memory；測試先 fail。
- 修改 `server.js`：先在 Green 階段於現有 listener 內 inline 新增 `/api/metrics/memory` 與 `/api/metrics/disk` 兩個分支（呼叫 `si.mem()` / `si.fsSize()`，失敗回 `{ error: '<metric> sample failed' }` + 500）；Refactor 階段再把 `/api/metrics/*` 委派給新模組。
- 新增 `server/metricsRouter.js`：搬遷 `readCpu()` 並新建 zero-arg `readMemory()` / `readDisk()`；匯出 `metricsRouter(req, res)` 以小型 dispatch 表 `{ cpu, memory, disk }` 分派，try/catch 統一錯誤格式為 `{ error: '<metric> sample failed' }` + 500；未知 `/api/metrics/<x>` 由 router 回 `false`，由 `server.js` 主 listener 走既有 404 envelope。
- 修改 `server.js`：Refactor 後僅保留 `createServer()` + `/healthz` + 404 fallback；對 `/api/metrics/*` 委派給 `metricsRouter`。`readCpu()` 與 `import * as si` 從 `server.js` 移除。
- **鎖定的決策**：
  - Memory: `usedBytes = mem.active`、`totalBytes = mem.total`、`usagePercent = active / total * 100`（與 macOS Activity Monitor / Linux htop 一致）。
  - Disk: 只保留 type ∈ `{apfs, ext4, ext3, ext2, xfs, btrfs, zfs, ntfs, vfat, exfat}` **AND** `size > 0` **AND** mount path 不以 `/System/Volumes/` 開頭的條目。
  - 錯誤格式: 沿用 phase #1 / #2 envelope `{ error: <string> }` + `Content-Type: application/json` + 500。
  - Helper 形狀: `readMemory()` / `readDisk()` 為 zero-arg async（與 `readCpu()` 一致）；fixture 注入留到 phase #8。
  - Router 位置: **新檔** `server/metricsRouter.js`（不留在 `server.js` 內），讓 `server.js` 不再隨 metric 數量膨脹。
- **非變更**：
  - 不引入前端、Vite、Recharts、polling（屬 phase #4 / #6）。
  - 不引入 `node:os` fallback（`systeminformation` 在 phase #2 已驗證可用）。
  - 不引入 fixture 注入或 sampler DI（屬 phase #8）。
  - 不快取採集結果。
  - 不改 `docs/*`（roadmap / mission / tech-stack 內容皆已支援本 change）。
  - 不新增 npm dependency（`systeminformation` 已在 phase #2 引入）。
  - 不抽出共用「DTO 範圍驗證」測試工具；三支 metric 測試各自 inline 斷言。

## Capabilities

### New Capabilities
<!-- 無：本 change 不引入新 capability。Memory / Disk metric 與 metricsRouter 都屬於既存 `backend-server` capability 的擴充。 -->

### Modified Capabilities
- `backend-server`: 新增四條 requirement —— (a)「Memory metric endpoint returns systeminformation snapshot」、(b)「Disk metric endpoint returns filtered mounts」、(c)「Memory and Disk sampling are encapsulated in pure helpers」、(d)「Metric routes are dispatched through metricsRouter」。既有 healthz / CPU / `createServer()` requirement 不變更，但 (d) 的 router 委派 scenario 必須與既有「Importing createServer does not start listening」相容。

## Impact

- **新增檔案**：`tests/server/memory.test.js`、`tests/server/disk.test.js`、`server/metricsRouter.js`、`openspec/changes/add-memory-disk-metrics/{proposal.md, design.md, tasks.md, specs/backend-server/spec.md}`。
- **既有檔案修改**：`server.js`（移除 `readCpu()` 與 `/api/metrics/cpu` inline 分支，改委派 `metricsRouter`）。
- **npm 相依**：無變動（`systeminformation` ^5 已存在）。
- **目錄結構**：repo 第一次出現 `server/` 子目錄；後續若有更多後端模組（如 phase #8 的 fixture loader）可在此目錄擴充。
- **流程影響**：reviewer 多兩條驗證指令對應 `docs/roadmap.md` 階段 #3：`curl -s localhost:3001/api/metrics/memory | jq` 與 `curl -s localhost:3001/api/metrics/disk | jq`；單條 `npm test -- metrics` 全綠視為階段 #3 完成。
- **解鎖**：roadmap phase #4（前端骨架 + `/healthz` 串接）可在 phase #4 / #5 一次 fetch 全部三條 metric route；phase #8 fixture 注入只需修改 `server/metricsRouter.js` 一處。
