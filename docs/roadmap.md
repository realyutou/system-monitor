# Roadmap

實作切成 **8 個極小階段**，每個階段都以 `🔴 Red → 🟢 Green → ♻️ Refactor` 三步走，並附一個 reviewer 可直接執行的「驗證指令」。階段順序遵循「後端骨架 → 後端 API → 前端骨架 → 前端視覺化 → 即時更新 → 體驗 → 測試覆蓋」的依賴關係。

## 階段總表

| # | 目標 | 🔴 Red（先寫測試） | 🟢 Green（最小實作） | ♻️ Refactor | 驗證指令 |
| - | --- | --- | --- | --- | --- |
| 1 | **Backend skeleton + `/healthz`** | Supertest：`GET /healthz` 應回 200 且 body `{ status: 'ok' }`；測試先 fail。 | 用選定的 HTTP 框架（階段 1 同時敲定 Express / Fastify / `node:http`）啟動 server，加上 `/healthz` 處理器讓測試轉綠。 | 抽出 `createServer()` 工廠以便 Supertest 不啟 port；統一 port 常數。 | `npm test -- healthz` 全綠 + `curl -s localhost:3001/healthz` 回 `{"status":"ok"}` |
| 2 | **CPU metric API** | Supertest：`GET /api/metrics/cpu` 回 200，body 必須含 `{ usagePercent: number, cores: number, timestamp: string }`，且 `usagePercent` 在 0–100。 | 接入 `systeminformation.currentLoad()`，把欄位映射成上述 contract；確認測試綠燈。 | 將「採集 → 轉 DTO」抽成 `readCpu()` 純函式，方便日後注入 fake 資料。 | `npm test -- cpu` 全綠 + `curl -s localhost:3001/api/metrics/cpu \| jq` |
| 3 | **Memory + Disk metric API** | 每 endpoint 各一支 Supertest：`/api/metrics/memory` 回 `{ usedBytes, totalBytes, usagePercent }`；`/api/metrics/disk` 回 `{ mounts: [{ fs, usedBytes, totalBytes, usagePercent }] }`。兩支測試都先 fail。 | 各自實作 handler，套用相同 `readMemory()` / `readDisk()` 模式。 | 抽 `metricsRouter` 把三條 metric route 收斂在一個檔案；統一錯誤格式。 | `npm test -- metrics` 全綠（涵蓋 cpu / memory / disk 三條） |
| 4 | **Frontend skeleton + 串接 `/healthz`** | React Testing Library：render `<App />`，斷言畫面出現「Backend: ok」字樣（mock `fetch('/healthz')` 回 200）。先 fail。 | Vite + React + TypeScript 骨架；`useEffect` 內 `fetch('/healthz')`，狀態顯示在頁面上；測試轉綠。 | 抽 `useHealth()` hook；把 fetch URL 收進 `src/lib/api.ts`。 | `npm test -- app` 全綠 + `npm run dev` 後瀏覽器看到 "Backend: ok" |
| 5 | **第一張 Recharts 圖（CPU 折線，靜態 fetch）** | RTL + 固定 fixture：餵 `<CpuChart data={fixtures.cpu.idle} />`，斷言畫面渲染出對應點數的 `<path>` 或 axis tick；先 fail。 | 用 Recharts 的 `<LineChart>` 包出 `<CpuChart>`，接受 props；同時頁面層改成 fetch `/api/metrics/cpu` 一次然後渲染。 | 把資料轉換（API DTO → chart row）抽成 `toCpuSeries()` 純函式並單測。 | `npm test -- cpu-chart` 全綠 + `npm run dev` 後看到一張靜態 CPU 折線 |
| 6 | **即時更新 polling + 多圖** | Vitest fake timers：mount `<App />`，斷言每 `advanceTimersByTime(2000)` 會多觸發一次 `/api/metrics/cpu` 的 fetch；先 fail。同時為 memory / disk 兩張圖各補一支渲染測試。 | 寫 `useMetricPolling(endpoint, intervalMs)` hook，預設 2000ms；在頁面層接上 CPU / Memory / Disk 三張圖。 | 把三張圖收進 `<Dashboard />` 容器；把 polling 間隔常數收進 `src/config.ts` 以便環境變數覆蓋。 | `npm test -- polling` 全綠 + `npm run dev` 後三張圖每 2 秒更新 |
| 7 | **RWD + 效能驗證** | RTL snapshot：在 1280 / 768 / 375 三種寬度下 render `<Dashboard />`，產生三份穩定 snapshot；任何版面破版會讓 snapshot diff 失敗。 | 加 CSS media queries / flex grid，讓三張圖在三種寬度下都不溢出；首屏 LCP < 2s 在 DevTools Performance 量到。 | 抽 `useViewport()` 或共用 layout 常數；移除重複的 media query。 | `npm test -- snapshot` 全綠 + Chrome DevTools Performance「LCP < 2.0s」截圖 |
| 8 | **≥ 3 個 test scenarios fixtures + 對應 Vitest 案例** | 為 `idle` / `medium-load` / `peak` 三組 fixture 各補一支 Vitest 案例（前端：圖表渲染對應形狀；後端：DTO 轉換結果符合預期）；先全部 fail。 | 在 `tests/fixtures/` 建立三組 JSON / TS fixture；把現有 hook 與 component 改成接受注入資料，使 fixture 可重放。 | 抽 `loadFixture(name)` helper；fixture 命名與內容寫進 `docs/` 或 fixture README，方便 reviewer 重現。 | `npm test -- scenarios` 全綠（≥ 9 個案例，3 fixtures × 3 條 metric） |

## 階段數檢核

8 個階段，落在 spec 要求的 **6–8 範圍內**。若實作時發現某階段過大或過小，調整方向為：

- **合併**：階段 2 + 3 可合併為「單一 metrics 階段」（→ 7 階段）。
- **拆分**：階段 6 可拆成「polling hook」與「多圖容器」（→ 9 階段，**禁止**，超出上限）。

任何階段數變動都必須同步修改本檔，並在 commit message 中說明「為何變動」。

## 跨階段紀律

- 每個階段提交時，commit message 顯式標註當前階段，例如：`stage 2 (green): CPU metric API returns systeminformation payload`。
- 每個階段的「驗證指令」必須能被 reviewer 直接 copy-paste 執行；若需要 seed 資料或環境變數，要附在指令旁。
- 階段內可以多個 commit，但任何 commit 必須維持 `npm test` 綠燈（Red 階段的失敗測試在同一 commit 內由 Green 實作補齊）。
