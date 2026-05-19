## Context

本 change 是 `docs/roadmap.md` 階段 #3 的落地。在此之前：

- Phase #1 (`2026-05-19-add-healthz`) 已交付 `server.js`：`createServer()` 工廠 + `node:http` + 單一 request handler 內以 `if (method, url)` dispatch。
- Phase #2 (`2026-05-19-add-cpu-metric`) 已交付 `/api/metrics/cpu`、zero-arg `readCpu()`、`systeminformation` ^5 runtime dep、Supertest 範圍斷言策略。
- `docs/roadmap.md` 階段 #3 contract 寫死：
  - `/api/metrics/memory` → `{ usedBytes, totalBytes, usagePercent }`。
  - `/api/metrics/disk` → `{ mounts: [{ fs, usedBytes, totalBytes, usagePercent }] }`。
  - Refactor 步驟：「抽 `metricsRouter` 把三條 metric route 收斂在一個檔案；統一錯誤格式。」
- `docs/tech-stack.md` §資料來源已釘 `systeminformation` 首選、`node:os` fallback；fallback 條件未觸發。

約束：

- **TDD 強制**（`docs/mission.md` §品質原則）：每條 endpoint 各先寫一支 fail 的 Supertest，再寫實作；Refactor 在綠燈下進行。commit log 必須顯示 red → green (memory) → green (disk) → refactor 順序。
- **效能預算**（`docs/tech-stack.md` §效能預算）：本機單一 metric API < 100 ms。`si.mem()` 為 in-memory snapshot 幾乎瞬時；`si.fsSize()` 需 stat 所有掛載點，過濾後留 1–3 條本機磁碟，預期仍 < 30 ms。
- **最小實作**：fixture 注入是 phase #8 的工作，本階段刻意不抽 sampler DI；`readMemory()` / `readDisk()` 維持 zero-arg。
- **`createServer()` 對外形狀不變**：phase #1 spec scenario「Importing createServer does not start listening」必須仍成立。
- **三條 metric route 全部統一錯誤格式**：phase #1 / #2 既有 envelope `{ error: <string> }` 是統一基準，不另發明新 envelope。

## Goals / Non-Goals

**Goals:**

- `GET /api/metrics/memory` → 200 + JSON `{ usedBytes: integer ≥ 0, totalBytes: integer ≥ 1, usagePercent: number ∈ [0, 100] }`，`usedBytes ≤ totalBytes`，`Content-Type: application/json`。
- `GET /api/metrics/disk` → 200 + JSON `{ mounts: Array<{ fs: string, usedBytes: integer ≥ 0, totalBytes: integer ≥ 1, usagePercent: number ∈ [0, 100] }> }`，`mounts.length ≥ 1`（本機正常情況），`Content-Type: application/json`。
- 採集失敗 → 500 + `{ error: '<metric> sample failed' }` + `Content-Type: application/json`，沿用 phase #1 / #2 envelope 形狀。
- `readMemory()` 與 `readDisk()` 為 zero-arg async function，與 `readCpu()` 一致；三者一起住在 `server/metricsRouter.js`。
- 抽出 `metricsRouter(req, res)`：對 `/api/metrics/<cpu|memory|disk>` 分派、try/catch 統一錯誤格式；對未知 `/api/metrics/<x>` 回 `false`（由 `server.js` 主 listener 處理 404）。
- `server.js` Refactor 後僅保留 `createServer()` + `/healthz` + 委派 + 404 fallback；不再 import `systeminformation`。
- 對應 `docs/roadmap.md` 階段 #3 驗證指令（`npm test -- metrics` 全綠，涵蓋 cpu / memory / disk 三條）。

**Non-Goals:**

- 不引入前端、Vite、Recharts、polling（屬 phase #4 / #6）。
- 不引入 `node:os` fallback；`systeminformation` 在 phase #2 已驗證可用。
- 不引入 fixture 注入或 sampler DI；fixture 機制屬 phase #8。
- 不快取採集結果。
- 不引入 graceful shutdown、CORS、request id、結構化 logging（mission 非目標）。
- 不抽 `server/healthz.js`：`/healthz` 是 phase #1 的固定回覆，無採集邏輯，留在 `server.js` 是最小實作。
- 不寫 500 path 的測試（需 module mock，成本高於收益）；spec scenario 仍列出該行為，phase #8 fixture 階段補測試。

## Decisions

### 1. Memory `usedBytes` = `mem.active`

**選擇**：`readMemory()` 內 `const m = await si.mem(); return { usedBytes: m.active, totalBytes: m.total, usagePercent: m.active / m.total * 100 };`。

**為何**：

- `mem.active` 在 macOS / Linux 上對應「真正使用中、無法立即回收」的記憶體，與 Activity Monitor / htop 顯示的 used 一致。Reviewer 截圖比對時數字會對得起來，這比實作便利更重要。
- `mem.used`（= total - free）在 Linux 上常被誤判為「快滿了」，但其實 cache 可瞬間釋放；macOS 上接近 active 但語意較糊。
- `total - available` 結果幾乎等同 active，但多一步減法、可讀性弱。

**替代方案考慮**：

- `mem.used`：捨棄，理由如上（Linux 容易誤判）。
- `total - available`：捨棄，與 active 等價但繞一圈。

### 2. `usagePercent` 在 server 端算，不丟給前端

**選擇**：`usagePercent = active / total * 100`，由 `readMemory()` 直接回傳。

**為何**：

- Roadmap contract 把 `usagePercent` 列為回傳欄位，前端拿到就應該能直接畫；若丟給前端算，三張圖各算一遍，contract 不對稱（CPU 已是 server 端算好）。
- 避免前端的浮點除法散落多處。

**替代方案考慮**：只回 `usedBytes` / `totalBytes`，前端自算。捨棄，違反 contract 對稱性。

### 3. Disk 過濾規則：type allowlist + `size > 0` + 排除 `/System/Volumes/`

**選擇**：`readDisk()` 內

```js
const FS_TYPES = new Set(['apfs', 'ext4', 'ext3', 'ext2', 'xfs', 'btrfs', 'zfs', 'ntfs', 'vfat', 'exfat']);
const fs = await si.fsSize();
return {
  mounts: fs
    .filter((m) => FS_TYPES.has(m.type?.toLowerCase()) && m.size > 0 && !m.mount.startsWith('/System/Volumes/'))
    .map((m) => ({
      fs: m.fs,
      usedBytes: m.used,
      totalBytes: m.size,
      usagePercent: m.use,
    })),
};
```

**注意**：type 比對 `toLowerCase()` 後再查 set；`systeminformation` 在 macOS 回傳 `'APFS'`（大寫）、Linux 回傳 `'ext4'`（小寫），normalize 後 allowlist 保持單一 source of truth。

**為何**：

- 全傳會在 macOS 上回 10+ 條（snapshot、firmlink、`map auto_home`），多數 `size = 0` 或 `use ≈ 100%` 的系統卷；reviewer 與前端 chart 都得自己處理雜訊。
- Type allowlist 直接針對「真實持久化儲存」的常見檔案系統；tmpfs / overlay / squashfs / devfs / autofs 自然被排除。
- `size > 0` 過濾 macOS 的 firmlink 與 Linux 的零容量虛擬掛載。
- `/System/Volumes/` 前綴是 macOS Catalina+ firmlink 的固定位置；單獨判斷 `mount` 路徑而不依賴 type 是因為這些條目 type 也是 `apfs`，與根掛載一樣。
- 過濾後本機常見 1–3 條（macOS 上通常只有根掛載 `/`；Linux 上根掛載 + 可能的 `/home` / `/boot`）。

**替代方案考慮**：

- 全傳：捨棄，雜訊太大。
- 單純 `size > 0`：捨棄，仍含 firmlink。
- 黑名單 type（排除 tmpfs / devfs ...）：捨棄，allowlist 更安全，未知檔案系統不會洩漏。
- 只保留 `mount === '/'`：捨棄，會丟掉真實的 `/home`、`/Volumes/External` 等使用者掛載。

### 4. Disk `mounts[]` 空陣列是合法回應

**選擇**：若 filter 後 mounts 為空，仍回 200 + `{ mounts: [] }`，**不**回 500。

**為何**：

- 採集本身成功（`fsSize()` 沒擲錯），只是過濾後沒有符合條件的條目；這不是 server 錯誤，是「沒東西可報」的合法狀態。
- 前端可以自己決定空陣列要顯示「無可用磁碟」或 hide chart；server 不該替前端決定。
- Spec scenario 把「`mounts.length ≥ 1`」放進「本機正常情況」描述而非 normative 強制，避開 reviewer 在容器內測試（filter 後可能空）的誤判。

**替代方案考慮**：空陣列 → 500。捨棄，破壞「採集成功 / 失敗」的語意。

### 5. `metricsRouter` 抽到新檔 `server/metricsRouter.js`

**選擇**：建立 `server/` 子目錄；`metricsRouter.js` 內含三個 `readX()` helper + dispatch 表 + `metricsRouter(req, res)` 匯出。`server.js` 內

```js
import { metricsRouter } from './server/metricsRouter.js';
// listener 內
if (req.method === 'GET' && req.url?.startsWith('/api/metrics/')) {
  const handled = await metricsRouter(req, res);
  if (handled) return;
}
// 既有 /healthz + 404 fallback
```

**為何**：

- Roadmap 字面要求「**收斂在一個檔案**」，新檔最貼近字面意義。
- `server.js` 隨 metric 數量膨脹的問題在 phase #3 就要解決；若留在 `server.js` 內，phase #8 fixture 階段又得抽一次。
- `server/` 子目錄為未來後端模組（phase #8 fixture loader）留位置。
- import path 變更不影響 phase #1 spec「Importing createServer does not start listening」：`metricsRouter.js` 純函式 + 無 module-scope side effect。

**替代方案考慮**：

- `server.js` 內函式：捨棄，違反字面、後續還要抽。
- 三個 metric 各自一檔（`server/cpu.js` / `server/memory.js` / `server/disk.js`）+ `server/metricsRouter.js`：捨棄，過度切割；三個 helper 都 < 10 行。

### 6. Router 對未知 `/api/metrics/<x>` 回 `false`，由主 listener 走 404

**選擇**：`metricsRouter(req, res)` 簽名為 `async (req, res) => boolean`：

- 認得的 `cpu` / `memory` / `disk`：寫 response，回 `true`。
- 不認得（如 `/api/metrics/foo`）：不寫 response，回 `false`。
- `server.js` 主 listener 收到 `false` 後繼續走 404 fallback。

**為何**：

- 404 envelope 是 phase #1 spec scenario，已固定形狀；不該被 router 重寫。
- Router 只負責「我會處理什麼」，不負責「兜底未知」；單一職責。
- 測試 `GET /api/metrics/foo` 可斷言仍走主 listener 的 404 envelope，與 `/does-not-exist` 行為一致。

**替代方案考慮**：

- Router 也回 404：捨棄，重複實作 404 envelope。
- Router 用 throw 表示「不認得」：捨棄，throw 應保留給真實錯誤。

### 7. 錯誤格式統一 = `{ error: '<metric> sample failed' }`

**選擇**：`metricsRouter` 內 try/catch 對所有 metric 採同一形狀：

```js
catch (err) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: `${metricName} sample failed` }));
}
```

**為何**：

- Phase #2 的 `{ error: 'cpu sample failed' }` 是現行基準；新 endpoint 平行命名（`'memory sample failed'` / `'disk sample failed'`）對 reviewer 與前端都一致。
- 與 phase #1 的 404 envelope `{ error: 'not found' }` 同 envelope 形狀（`{ error: string }`）；前端只需學一種錯誤殼。
- 不引入 `metric` 欄位：metric 名稱已在訊息字串內，多一個欄位無收益且破壞「envelope 形狀完全等同 phase #1 / #2」的對稱性。

**替代方案考慮**：

- `{ error: 'sample failed', metric: 'cpu' }`：捨棄，理由如上。
- 每個 metric 自訂錯誤訊息（如 `'failed to read memory'`）：捨棄，命名節奏不一致。

### 8. `readMemory()` / `readDisk()` 為 zero-arg async（與 `readCpu()` 一致）

**選擇**：

```js
async function readMemory() {
  const m = await si.mem();
  return { usedBytes: m.active, totalBytes: m.total, usagePercent: (m.active / m.total) * 100 };
}

async function readDisk() {
  const fs = await si.fsSize();
  return { mounts: fs.filter(...).map(...) };
}
```

**為何**：

- 與 phase #2 `readCpu()` 形狀一致（同樣 zero-arg async），讀者一眼 mapping。
- Fixture 注入是 phase #8 的工作；屆時三個 helper 一起改 signature 邊際成本低。
- DI 版本（`readMemory(sampler = si.mem)`）為「未來能力」設計，違反最小實作。

**替代方案考慮**：sampler DI。捨棄，理由如上。

### 9. 三條 metric handler 各自 inline 寫 response，不抽 `respondJson()` helper

**選擇**：`metricsRouter` 內 dispatch 表 + try/catch 直接 `res.writeHead` / `res.end`，不抽出 `respondJson(res, status, body)` 之類的 helper。

**為何**：

- 重複只有 3 次（cpu / memory / disk），抽 helper 收益小、間接層代價大。
- Phase #1 / #2 已是這個風格，維持一致。
- 若 phase #4+ 真的需要更多 JSON response 才考慮抽。

**替代方案考慮**：抽 `respondJson()` / `respondError()`。捨棄，DRY 三次不算重複。

### 10. 測試策略：呼叫真實 `systeminformation`，靠範圍斷言取得穩定性

**選擇**：`memory.test.js` / `disk.test.js` 直接 `await request(createServer()).get('/api/metrics/<x>')`，不 mock `systeminformation`。斷言用 `expect.any(Number)` + 範圍檢查 + 不變式（`usedBytes ≤ totalBytes`、`Number.isInteger(usedBytes)`、`Array.isArray(mounts)`、`mounts.length ≥ 1`）。

**為何**：

- 與 phase #2 `cpu.test.js` 策略一致。
- Mock `systeminformation` 需要 module-level interception，與「不引入 DI」決策衝突。
- 範圍斷言對任何時刻採到的數值都穩定，CI / 本機都一致。
- 跑真實 library 本身就是整合測試的價值，確認 `si.mem()` / `si.fsSize()` 在 reviewer 機器上跑得起來。

**測試斷言 disk mounts 至少 1 條的安全性**：本 demo 預設在 reviewer 本機（macOS / Linux）執行，根掛載必然存在；CI / 容器若真踩到空 mounts，再回頭調整測試（改為 `mounts.length >= 0` + 對非空時的元素形狀斷言）。本階段不為假設情境設計。

### 11. Refactor 順序：先在 `server.js` inline 落地兩條 metric 再抽 router

**選擇**：tasks 順序為 (1) Red → (2) Green memory inline → (3) Green disk inline → (4) Refactor 抽 router。

**為何**：

- 任何 commit 都維持 `npm test` 綠燈（`docs/mission.md` §跨階段紀律）；先抽 router 再實作會在中間 commit 留下空 router。
- Green 階段同時跑兩條 metric 的 inline 實作，立刻得知 `si.mem()` / `si.fsSize()` 在本機行為；抽 router 時已有具體實作可搬，重構風險低。
- Refactor commit 純粹搬遷 + 統一錯誤格式，diff 易讀。

**替代方案考慮**：先抽空 router 再實作。捨棄，違反逐 commit 綠燈。

## Risks / Trade-offs

- **[Risk]** `si.fsSize()` 在掛載很多檔案系統的環境（如 Linux 多 NFS / FUSE）耗時可能 > 100 ms 預算 → **Mitigation**：本機 reviewer 環境（macOS / Linux 工作站）過濾後 1–3 條，預期 < 30 ms；若 phase #6 polling 量測時實際超預算，回頭考慮 5 s in-memory cache，並更新 `docs/tech-stack.md` §效能預算。
- **[Risk]** Disk 過濾規則可能漏掉冷門檔案系統（如 reviewer 用 zfs subvolume）→ **Mitigation**：allowlist 已含 zfs / btrfs；未列入的檔案系統屬非常態，留待 reviewer 回報時再加；不在本 change 預先 over-engineer。
- **[Risk]** Memory `mem.active` 在某些舊 Linux kernel 上可能為 `undefined` → **Mitigation**：`systeminformation` ^5 已對舊 kernel 兜底回 0；若真踩到 0 / NaN，`usagePercent = NaN` 會讓測試的「∈ [0, 100]」斷言 fail，提早暴露。
- **[Risk]** Refactor 抽 router 後 `server.js` 的 `await metricsRouter(req, res)` 變成 async 邊界，未捕捉的 promise rejection 會讓 `node:http` 失去 response → **Mitigation**：`metricsRouter` 內部 try/catch 涵蓋整個 await 區塊；任何 throw 都會被轉成 500 envelope；router 本身不再 throw。
- **[Risk]** Phase #1 spec scenario「Importing createServer does not start listening」可能因 `import './server/metricsRouter.js'` 的 module-scope side effect 被破壞 → **Mitigation**：`metricsRouter.js` 嚴格只做 `import * as si` 與 function declaration，不在 top-level 跑任何採集或 listen；可在 task 5.x 用 `node --input-type=module -e "import('./server/metricsRouter.js')"` 跑一次驗證不印日誌、不開 port。
- **[Trade-off]** 三條 metric helper 都不接受 sampler DI → fixture 階段（phase #8）需一次重構三個 signature。可接受，phase #8 屆時無論如何都會重構，邊際成本低；本階段刻意守「最小實作」。
- **[Trade-off]** 500 path 不寫測試 → 該分支 untested。可接受，理由同 phase #2；spec scenario 仍列出該行為。
- **[Trade-off]** Disk 過濾規則寫死在 helper 內，未抽 config → reviewer 在不常見環境可能看不到自己的磁碟。可接受，避免 phase #3 提前引入 config 機制；reviewer 若回報，再開新 change 把 allowlist 抽進 `server/config.js`。
- **[Trade-off]** Router 採 boolean 回傳而非 throw `RouteNotMatched` → 介面風格與 Express middleware 不同。可接受，本專案不用 Express；boolean 對 0 dependency 的純函式更直觀。
- **[Trade-off]** 不快取 `si.fsSize()` → 高頻 polling 時每次都 stat 所有掛載點。可接受，phase #6 polling 預設 2 s 遠大於採集成本；快取會引入 stale data 與 invalidate 邏輯，phase #3 不值得。

## Migration Plan

不適用（純新增）。撤回方式：

1. 刪除 `tests/server/memory.test.js`、`tests/server/disk.test.js`。
2. 刪除 `server/metricsRouter.js` 與 `server/` 目錄。
3. 在 `server.js` 還原 phase #2 結尾狀態：重新 `import * as si`、把 `readCpu()` 與 `/api/metrics/cpu` 分支搬回，移除 `metricsRouter` import 與委派分支。
4. 跑 `npm test` 確認 healthz + cpu 仍綠。
5. 不需動 `package.json`（`systeminformation` 在 phase #2 已引入）。

## Open Questions

- **Disk 是否要回 `mountPoint` 欄位？** 不在 roadmap contract 內；前端 phase #5 只需要 `fs` 當 label。本階段不加，等前端真需要時再開新 change。
- **`/api/metrics/all` 聚合 endpoint 是否值得加？** 不在 roadmap contract 內；前端 phase #6 polling 每條 metric 各自 2 s 是設計上獨立的。本階段不加；若 phase #6 量測發現三條獨立 fetch 超首屏預算，再開新 change 加聚合。
- **是否在 `server/metricsRouter.js` 內加 type 註解（JSDoc）？** 後端是純 JS（`docs/tech-stack.md`），phase #2 helper 沒加。本階段維持一致不加，等真的有對外文件需求再評估。
