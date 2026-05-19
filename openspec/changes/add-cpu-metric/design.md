## Context

本 change 是 `docs/roadmap.md` 階段 2 的落地。在此之前：

- Phase #1 (`2026-05-19-add-healthz`) 已交付 `server.js`：`createServer()` 工廠 + `node:http` + 單一 request handler 內以 `if (method, url)` dispatch；測試以 Supertest 直接吃 `http.Server` 物件。
- `docs/tech-stack.md` §資料來源已釘 `systeminformation` 為首選、`node:os` 為 fallback；但本 repo 尚未引入任何 runtime npm 相依。
- `docs/roadmap.md` 階段 2 的 contract 寫死：`{ usagePercent: number, cores: number, timestamp: string }`，且 `usagePercent` 在 0–100；驗證指令是 `npm test -- cpu` 全綠 + `curl -s localhost:3001/api/metrics/cpu | jq`。

約束：

- **TDD 強制**（`docs/mission.md` §品質原則）：先寫會 fail 的 Supertest，再寫實作；commit 順序必須能在 `git log` 看到 red → green → refactor。
- **效能預算**（`docs/tech-stack.md` §效能預算）：本機單一 metric API < 100 ms。`systeminformation.currentLoad()` 內部會做兩次 sample 取差值，預設間距 ~10ms，遠低於預算。
- **最小實作**（`docs/mission.md` §品質原則）：禁止為假設未來需求設計；fixture 注入是 phase #8 的工作，本階段刻意不抽 sampler DI。
- **`createServer()` 不可改變對外形狀**：phase #1 spec 已釘「import 時不會 listen、不會印 startup log」，本 change 不得破壞。

## Goals / Non-Goals

**Goals:**

- `GET /api/metrics/cpu` → 200 + JSON contract（`usagePercent: number`、`cores: number`、`timestamp: string ISO 8601`）+ `Content-Type: application/json`。
- 採集失敗（`currentLoad()` throw）→ 500 + JSON envelope `{ error: 'cpu sample failed' }` + `Content-Type: application/json`，沿用 phase #1 的 404 envelope 形狀。
- Refactor 後 `readCpu()` 為 zero-arg `async function`，handler 只負責 HTTP I/O，DTO 組裝完全在 helper 內。
- 第一次落地 runtime npm 相依（`systeminformation` ^5），確認其在 macOS / Linux 本機 Node 20 環境能 `currentLoad()` 不擲錯。
- 對應 `docs/roadmap.md` 階段 2 兩條驗證指令（`npm test -- cpu` 與 `curl ... /api/metrics/cpu | jq`）可被 reviewer 直接 copy-paste 執行。

**Non-Goals:**

- 不做 `/api/metrics/memory` 與 `/api/metrics/disk`（roadmap phase #3）。
- 不抽 `metricsRouter`（roadmap phase #3 Refactor）；本階段三條 route（`/healthz`、未實作的 cpu、404 fallback）仍住在 `createServer()` 單一 handler 內。
- 不為 `readCpu()` 引入 sampler 注入或 module-level mock；fixture 機制是 roadmap phase #8 的工作。
- 不快取採集結果；polling 頻率是前端決定的（roadmap phase #6），後端每 request 都打一次 `currentLoad()`。
- 不做 fallback 至 `node:os`；`docs/tech-stack.md` 把 `node:os` 列為 fallback，但要等到實測 `systeminformation` 真的失敗才動。
- 不改 `docs/tech-stack.md`：資料來源欄位已在憲法層級寫好「首選 `systeminformation`」，本階段只是落實，不涉及文件層級的決策關閉。
- 不引入 graceful shutdown、CORS、request id、結構化 logging；這些在 mission 非目標清單內。

## Decisions

### 1. `usagePercent` 直接映射 `currentLoad().currentLoad`

**選擇**：handler 內 `const load = await si.currentLoad(); const usagePercent = load.currentLoad;`。

**為何**：

- `systeminformation` 已算好「整體 CPU 使用率（百分比）」並命名為 `currentLoad`，跨平台一致（macOS / Linux / Windows）。
- 與 `100 - load.currentLoadIdle` 數學等價，但少一步減法、語意更直接。
- 自己迭代 `load.cpus[].load` 算平均會增加 surface area 且結果相同。

**替代方案考慮**：

- `100 - currentLoadIdle`：捨棄，理由如上。
- 平均 `cpus[].load`：捨棄，自己寫迴圈無收益。

### 2. `cores` 來源 = `currentLoad().cpus.length`

**選擇**：handler 從同一個 `currentLoad()` 回傳值取 `cpus.length`。

**為何**：

- 保持「資料只來自 `systeminformation` 一個來源」的原則，不混 `os.cpus().length`。
- 同一次 sample 內取 cores，邏輯上完整對應同一個時刻。
- 物理 / 邏輯核心數差異對本 demo 無實際影響；`cpus.length` 對應邏輯核心，與 `os.cpus()` 一致。

**替代方案考慮**：`os.cpus().length`。捨棄，理由：增加第二個資料來源、無收益。

### 3. `timestamp` = handler 內 `new Date().toISOString()`

**選擇**：採集完成後在 handler / helper 內計算 ISO 8601 字串。

**為何**：

- `systeminformation.currentLoad()` 不保證有時間戳欄位；自己生最簡單可靠。
- ISO 8601 字串對 reviewer 用 `jq` 看輸出最清楚（`"2026-05-19T08:42:13.123Z"` 一眼可讀）。
- 前端 `new Date(s)` 直接吃，無需轉型；Recharts 時間軸（roadmap phase #5）也吃 Date 物件。
- Roadmap contract 只規定 `timestamp: string`，未指定格式；ISO 8601 是合理預設。

**替代方案考慮**：Unix epoch ms 字串（如 `"1747641733123"`）。捨棄，理由：人眼讀不出時間、reviewer 比較難用 `jq` 驗證。

### 4. 錯誤路徑 = 500 + JSON envelope，沿用 phase #1 形狀

**選擇**：

```js
try {
  const dto = await readCpu();
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(dto));
} catch (err) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'cpu sample failed' }));
}
```

**為何**：

- Phase #1 spec 已釘 404 path 回 `{ error: 'not found' }` JSON envelope；500 path 用相同形狀（`{ error: <string> }`）讓所有非 200 response 結構一致，reviewer 與前端只需學一種錯誤殼。
- Fail-open（200 + `usagePercent: 0`）會掩蓋採集失敗，與 demo 的「展示工程素養」訴求衝突——應該讓問題顯式浮現。
- 不主動處理（讓 `node:http` 預設 500 純文字）會破壞 Content-Type 一致性。

**替代方案考慮**：

- 200 + 零值：捨棄，掩蓋 bug。
- 讓例外冒上去（預設 500 純文字）：捨棄，body 形狀與其他 route 不一致。

### 5. `readCpu()` 為零引數 wrapper（不接受 sampler 注入）

**選擇**：

```js
async function readCpu() {
  const load = await si.currentLoad();
  return {
    usagePercent: load.currentLoad,
    cores: load.cpus.length,
    timestamp: new Date().toISOString(),
  };
}
```

**為何**：

- Roadmap 階段 2 Refactor 步驟的目標是「把採集 → DTO 抽成純函式」，零引數版本最小、最符合「最小實作」原則。
- Sampler 注入（`readCpu(sampler = si.currentLoad)`）是為了「未來注入 fake 資料」的能力；但 fixture 注入是 phase #8 才需要，phase #8 屆時會一次重構三條 metric helper，此時 DI 改動成本極低。
- Phase #2 本身不需要該能力——測試直接呼叫真實 `systeminformation`、靠範圍斷言取得穩定性，不靠 mock。
- 違反「最小實作」、「不為假設未來需求設計」的代價是技術債的雪球；本階段刻意守紀律。

**替代方案考慮**：`readCpu(sampler = si.currentLoad)` DI 版本。捨棄，理由如上。

### 6. 測試策略：呼叫真實 `systeminformation`，靠範圍斷言取得穩定性

**選擇**：`tests/server/cpu.test.js` 直接 `await request(createServer()).get('/api/metrics/cpu')`，不 mock `systeminformation`。斷言改用 `expect.any(Number)` + 範圍檢查（`0 ≤ usagePercent ≤ 100`、`cores ≥ 1`、`timestamp` 可被 `new Date()` parse）。

**為何**：

- Mock `systeminformation` 需要 module-level interception，與本階段「不引入 DI」決策衝突。
- 範圍斷言對任何時刻採到的 CPU 數值都穩定，CI / 本機都一致。
- 跑真實 library 的副作用就是這層整合測試本身——確認 `systeminformation` 在 reviewer 機器上跑得起來，比 unit-level mock 更貼近 demo 的價值。
- 500 path 不寫測試：要可靠模擬該分支需要 module mock，成本高於收益；phase #8 fixture 階段會回頭補。

**替代方案考慮**：

- Mock `systeminformation`：捨棄，引入 DI 的雪球太大。
- 用 `vi.spyOn` patch 一支特定函式：可行但需要重新匯出，與本階段 helper 形狀不相容。

### 7. Dependency 版本範圍 = `^5`

**選擇**：`package.json` 加 `"systeminformation": "^5"`。

**為何**：

- caret major 與 `vitest` (^1) / `supertest` (^6) 風格一致。
- `systeminformation` 5.x 系列穩定（2026 年仍維護），不需要釘 minor。
- 若未來真的踩到 5.x 內 breaking 再收斂。

**替代方案考慮**：釘 `^5.21`（minor）。捨棄，過度保守。

### 8. Route dispatch 仍住在 `createServer()` 單一 handler 內

**選擇**：phase #2 不抽 `metricsRouter`；繼續 `if (req.method === 'GET' && req.url === '/api/metrics/cpu') { ... }` 與 phase #1 的 `/healthz` 分支並列。

**為何**：

- Roadmap phase #3 Refactor 明文要求「抽 `metricsRouter` 把三條 metric route 收斂在一個檔案」——那是有三條 route 時才合理的抽象時機。
- 現在只有「healthz + cpu」兩條，加 router 等同提前抽象、違反最小實作。

### 9. Handler 由同步變 async 的影響

**選擇**：將原本 `createServer((req, res) => { ... })` 的 callback 改為 `async (req, res) => { ... }`。

**為何**：

- `currentLoad()` 是 async；handler 必須 await。
- `http.createServer` 接受 async listener；未 await 的 promise 拒絕會被 `node:http` 內部 emit 'error'，但本 change 透過 try/catch 涵蓋所有 async 失敗。
- `/healthz` 分支保持同步行為（不變更現有 spec），只在 `/api/metrics/cpu` 分支內 await。

**替代方案考慮**：在分支內用 `.then().catch()` 而不改 callback 為 async。可行但可讀性差，本專案以可讀性優先。

## Risks / Trade-offs

- **[Risk]** `systeminformation` 首次採集會回 0（library 內部需要兩次 sample 才能算 delta）→ **Mitigation**：library 自動處理首次採集，回傳值仍在 `[0, 100]` 範圍內；測試用範圍斷言（不檢查具體值）就不會受影響。
- **[Risk]** 在某些 Linux container 內 `currentLoad()` 可能擲錯（缺 `/proc` 等）→ **Mitigation**：try/catch 包住，回 500 而非 crash；reviewer 環境（macOS 本機）不會踩到，但仍把 error path 列為 spec scenario。
- **[Risk]** Async handler 內若有 uncaught rejection 會讓 `node:http` 失去 response → **Mitigation**：try/catch 涵蓋整個 await 區塊；linter / 人工複查雙重把關。
- **[Trade-off]** 不做 sampler 注入 → fixture 階段需要重構 `readCpu()` 接受參數。可接受，因為 phase #2 不需要該能力，提前抽違反「最小實作」；phase #8 屆時三條 metric helper 一起重構，邊際成本低。
- **[Trade-off]** 500 path 不寫測試 → 該分支 untested。可接受，因為要可靠模擬該分支需要 mock module（成本高），phase #8 fixture 階段會回頭補；spec scenario 仍列出該行為，將來補測試時有依據。
- **[Trade-off]** 不快取 → 高頻 polling 時每次都打 library。可接受，因為 `currentLoad()` ~10ms、polling 預設 2s（roadmap phase #6），CPU 成本可忽略；快取會引入 stale data 問題，不值得。
- **[Trade-off]** Handler 變 async → 與 phase #1 純同步 handler 風格不一致。可接受，因為這是 metric route 不可避免的本質（採集本身是 async）。

## Migration Plan

不適用（純新增）。撤回方式：

1. 刪除 `tests/server/cpu.test.js`。
2. 在 `server.js` 移除 `import * as si from 'systeminformation'`、`/api/metrics/cpu` 分支、`readCpu()`。
3. `package.json` 移除 `"systeminformation"` 並重跑 `npm install`。
4. 跑 `npm test` 確認 healthz 仍綠。

## Open Questions

- **是否要在 task 1.3 把 `currentLoad()` 的肉眼觀察存成 fixture？** 傾向否：本階段刻意不做 fixture，phase #8 才處理；observable 觀察只作為 smoke check。
- **若 reviewer 機器上 `systeminformation` 安裝失敗（例如 native build 問題），怎麼處理？** `systeminformation` 5.x 是純 JS（無 native 編譯），不應發生；若真踩到，再開新 change 評估切 `node:os` fallback。本 change 不預先處理。
