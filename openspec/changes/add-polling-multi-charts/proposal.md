## Why

`docs/roadmap.md` 階段 #6 要求把 stage 5 的單次 `/api/metrics/cpu` fetch 升級成 2 秒一次 polling、把 memory / disk 兩條 metric API 也拉進前端做成圖、並把三張圖收進 `<Dashboard />`、polling 間隔常數搬進 `src/config.ts`（可被環境變數覆蓋）。這是「即時更新」這條 reviewer 驗收項目（`BACKGROUND.md` step 4）真正落地的階段；同時也解鎖 stage 7（RWD）所需的「三張圖並存」與 stage 8（fixture 注入）所需的 transform / hook 分層。

## What Changes

- 新增 `src/config.ts`：export `POLL_INTERVAL_MS`（fallback 2000）與 `METRIC_HISTORY_LIMIT`（fallback 30）；兩者皆可被 `VITE_POLL_INTERVAL_MS` / `VITE_METRIC_HISTORY_LIMIT` 環境變數覆蓋；env 缺失或 parse 失敗時退回預設值。
- 新增 `src/config.test.ts`：驗證三條 fallback 路徑（缺、壞、有效）。
- 新增 `src/hooks/useMetricPolling.ts`：通用 polling hook `useMetricPolling<TDto, TRow>(fetcher, transform, intervalMs?, historyLimit?)`；內部維護 `TDto[]` ring buffer（上限 `historyLimit`）、tri-state status、以及成功 tick 時打上的 `lastUpdatedAt: number | null`（用於 disk 的 liveness UI，見下方 Dashboard 條目）；`useEffect` deps 僅依賴 `intervalMs` / `historyLimit`，`fetcher` / `transform` 透過 ref 抓最新版避免 interval 重建；cleanup 時 `clearInterval` + cancelled flag。
- 新增 `src/hooks/useMetricPolling.test.tsx`：fake timers 驗證 (a) mount 後即觸發第一次 fetch、(b) 每 `advanceTimersByTimeAsync(intervalMs)` 多觸發一次、(c) ring buffer 達上限後 oldest 被淘汰、(d) unmount 後不再 fetch、(e) fetcher reject 時 status 轉 'error'。
- 新增 `src/hooks/useMemory.ts`：薄 wrapper，內含 `getStampedMemory()`（在 `getMemory()` 結果上補一個 client-side `timestamp: new Date().toISOString()`）；`export const useMemory = () => useMetricPolling(getStampedMemory, toMemorySeries)`。
- 新增 `src/hooks/useDisk.ts`：薄 wrapper，`export const useDisk = () => useMetricPolling(getDisk, toDiskSnapshot)`。
- 新增 `src/lib/toMemorySeries.ts` + `.test.ts`：純函式 `toMemorySeries(dtos: StampedMemoryDto[]): MemoryChartRow[]`；型別 `MemoryChartRow = { time: number; usage: number }`（與 CPU 一致）；單測涵蓋空陣列、單筆、多筆順序保留。
- 新增 `src/lib/toDiskSnapshot.ts` + `.test.ts`：純函式 `toDiskSnapshot(dtos: DiskMetricDto[]): DiskMountBar[]`；型別 `DiskMountBar = { fs: string; usage: number }`；只用 `dtos[dtos.length - 1]` 的 mounts；單測涵蓋空陣列、單筆 N mounts、多筆只取最後一筆。
- 新增 `src/components/MemoryChart.tsx` + `.test.tsx` + `.fixtures.ts`：Recharts `<LineChart>` 鏡像 `<CpuChart>` 結構；`data-testid="memory-chart"`；接受 `data: MemoryChartRow[]` + 選填 `width` / `height`；fixture `memory.idle` ≥ 3 點。
- 新增 `src/components/DiskChart.tsx` + `.test.tsx` + `.fixtures.ts`：Recharts `<BarChart>`，每個 mount 一條 horizontal bar（dataKey `usage`、Y 軸 dataKey `fs`、X 軸 domain `[0, 100]`）；`data-testid="disk-chart"`；接受 `data: DiskMountBar[]` + 選填 `width` / `height`；fixture `disk.idle` ≥ 2 個 mount。
- 新增 `src/components/Dashboard.tsx` + `.test.tsx`：容器元件，內部呼叫 `useCpu()` / `useMemory()` / `useDisk()`、各自渲染對應 chart、`status === 'error'` 時顯示獨立 notice；`data-testid="dashboard"`。在 `<DiskChart>` 下方額外 render `Last updated: HH:MM:SS` 文字（讀 `useDisk().lastUpdatedAt`），給 disk snapshot 一個顯式的 polling-liveness 訊號；CPU / Memory 不重複，因為其 LineChart 每 tick 多一個 dot 已具備同等視覺。
- 修改 `src/lib/api.ts`：新增 `MEMORY_ENDPOINT` (`'/api/metrics/memory'`)、`MemoryMetricDto` (`{ usedBytes, totalBytes, usagePercent }`)、`getMemory()`；新增 `DISK_ENDPOINT` (`'/api/metrics/disk'`)、`DiskMetricDto` (`{ mounts: Array<{ fs, usedBytes, totalBytes, usagePercent }> }`)、`getDisk()`。
- 修改 `src/hooks/useCpu.ts`：重寫為 `useMetricPolling(getCpu, toCpuSeries)` 薄 wrapper；移除 stage 5 的 `useState/useEffect/getCpu` boilerplate；保留 `{ data, status }` 對外介面。
- 修改 `src/App.tsx`：移除直接 `useCpu` + `<CpuChart>`；改為 `<header>` + `<Dashboard />` 兩段結構；`Backend: ok` 文字維持在 header（stage 4 / 5 既有 RTL 斷言不破）。
- 修改 `src/App.test.tsx`：新增 polling 斷言（fake timers 驗證 `/api/metrics/cpu` 每 `POLL_INTERVAL_MS` 多被叫一次）；既有 5 個 case 與 fake timers 隔離（新 polling case 自帶 setup/teardown）；既有 `data-testid="cpu-chart"` 斷言改成查 `data-testid="dashboard"`（chart 移到 Dashboard 內部）或保留兩個 testid（兼容）。
- 修改 `src/App.module.css`：為 Dashboard 三圖區塊加最基本的縱向堆疊版面（RWD 留給 stage 7）；新增 `.timestamp` 規則供 disk last-updated 文字使用（mono、`--color-dim`、`tabular-nums`）。
- **BREAKING**（spec-level）：stage 5 archived spec scenario 「App calls /api/metrics/cpu exactly once during mount」必須 MODIFY 為「at least once during mount, and one additional call per `POLL_INTERVAL_MS`」；`useCpu` 不再保證「靜態 fetch」邊界。
- **鎖定的決策**：
  - Hook 介面：`useMetricPolling<TDto, TRow>(fetcher, transform, intervalMs?, historyLimit?)`，三個 wrapper（useCpu / useMemory / useDisk）薄封裝。
  - Hook 回傳：`{ data, status, lastUpdatedAt }` — `lastUpdatedAt` 在成功 tick 時 `Date.now()`，失敗分支不動。
  - Ring buffer：CPU / Memory 保最近 30 筆（≈60 秒 @ 2s）；Disk 也共用 hook 故同樣 ring buffer 30，但 `toDiskSnapshot` 只看 latest（記憶體成本可忽略，介面對稱）。
  - Disk 視覺：snapshot BarChart（每個 mount 一條 bar）；非時序；Dashboard 在 BarChart 下方畫 `Last updated: HH:MM:SS` 給 polling-liveness 訊號。
  - 三張圖共用 `YAxis width={100}`：plot area 起點對齊；DiskChart 用 `tickFormatter` 取 fs basename 才能在 100px 內顯示。
  - DiskChart Bar `fill="#9affc6"`：接 `--color-ok` 主題色，避免 Recharts 預設深紫在暗背景看不見。
  - Recharts `isAnimationActive={false}`：三張圖一致關閉動畫，避免 `<g.recharts-line-dots>` 在動畫期間被拔掉、reviewer 看到 CPU / Memory dot 對偶閃爍。
  - Memory client-side timestamp：在 wrapper 的 fetcher 補 `timestamp: new Date().toISOString()`，讓 `toMemorySeries(dtos)` 介面與 `toCpuSeries(dtos)` 對稱。
  - `<Dashboard />` 自有三個 hook（hook 不外推到 `<App />`）。
  - Env override：`VITE_POLL_INTERVAL_MS` / `VITE_METRIC_HISTORY_LIMIT`，build-time 注入；parse 失敗 fallback 預設值。
  - Fake timers 範圍：僅 polling-related test 啟用，避免破壞既有 `waitFor` 假設。
- **非變更**：
  - 不修改 `server.js` / `server/metricsRouter.js` / `tests/server/*`（後端 contract 已支援所有 endpoint）。
  - 不引入 `<ResponsiveContainer>`、media queries 或任何 RWD 變動（phase #7）。
  - 不建立 `tests/fixtures/` 目錄；fixture 仍 co-located 在 `src/components/`（phase #8）。
  - 不引入 React Query / SWR / Zustand 等 state library；polling 純 React hook。
  - 不引入 SSE / WebSocket；polling 預算內。
  - 不引入 `msw` / Service Worker；fetch mock 續用 `vi.stubGlobal`。
  - 不改 `vite.config.ts` proxy（`/api` 已支援所有 metric endpoint）。
  - 不改 `package.json` 的 dependencies（Recharts 已在 stage 5 加入）。

## Capabilities

### New Capabilities
<!-- 無：本 change 不引入新的 capability。`frontend-app` 已存在；本 change 擴充其 requirements。 -->

### Modified Capabilities
- `frontend-app`：擴充對外契約：(a) 新增 `useMetricPolling<TDto, TRow>(fetcher, transform, intervalMs?, historyLimit?)` 通用 hook；(b) 新增 `useMemory()` / `useDisk()` hook（與 `useCpu()` 對稱）；(c) 新增 `<MemoryChart />` 與 `<DiskChart />` 元件；(d) 新增 `<Dashboard />` 容器；(e) 新增 `toMemorySeries` / `toDiskSnapshot` 純函式；(f) `src/lib/api.ts` 新增 memory / disk endpoint + DTO + helper；(g) `src/config.ts` 引入 `POLL_INTERVAL_MS` / `METRIC_HISTORY_LIMIT` 常數與 env override；(h) **MODIFIED**：`useCpu()` 改為 `useMetricPolling` 薄 wrapper、`<App />` 改為 `<header>` + `<Dashboard />`、`/api/metrics/cpu` 在 mount 後 polling（不再保證 exactly once）。stage 4 既有 `Backend: ok` 顯示契約與 stage 5 `<CpuChart>` / `toCpuSeries` 純函式契約保留。

## Impact

- **新增檔案**：
  - 前端原始碼：`src/config.ts` / `src/config.test.ts`、`src/hooks/useMetricPolling.ts` / `.test.tsx`、`src/hooks/useMemory.ts`、`src/hooks/useDisk.ts`、`src/lib/toMemorySeries.ts` / `.test.ts`、`src/lib/toDiskSnapshot.ts` / `.test.ts`、`src/components/MemoryChart.tsx` / `.test.tsx` / `.fixtures.ts`、`src/components/DiskChart.tsx` / `.test.tsx` / `.fixtures.ts`、`src/components/Dashboard.tsx` / `.test.tsx`。
  - openspec：`openspec/changes/add-polling-multi-charts/{proposal.md, design.md, tasks.md, specs/frontend-app/spec.md}`。
- **既有檔案修改**：
  - `src/lib/api.ts`：新增 memory / disk endpoint + DTO + helper。
  - `src/hooks/useCpu.ts`：重寫為薄 wrapper。
  - `src/App.tsx`：改用 `<Dashboard />`。
  - `src/App.test.tsx`：新增 polling 斷言；既有 case 與 fake timers 隔離。
  - `src/App.module.css`：Dashboard 三圖縱向堆疊版面。
- **npm 相依**：無新增 / 無移除。
- **目錄結構**：`src/` 第一次出現 `config.ts`（與 `config.test.ts`）；`src/components/` 新增 MemoryChart / DiskChart / Dashboard。
- **流程影響**：
  - Reviewer 驗證 phase #6：兩個 terminal，A 跑 `node server.js`、B 跑 `npm start`，瀏覽器三張圖（CPU LineChart、Memory LineChart、Disk BarChart）每 2 秒更新；DevTools Network `/api/metrics/{cpu,memory,disk}` 各自每 2s 被請求一次。
  - `npm test` 同時跑 jsdom（前端）+ node（後端）；新增 config / useMetricPolling / toMemorySeries / toDiskSnapshot / MemoryChart / DiskChart / Dashboard / App polling 多支測試；既有 healthz / cpu / memory / disk / toCpuSeries / CpuChart 既有斷言全綠（useCpu / App 部分 case 因 MODIFIED 契約調整）。
  - `VITE_POLL_INTERVAL_MS=500 npm start`：DevTools 量到 fetch 間隔變 500ms（驗證 env override）。
- **解鎖**：
  - phase #7 RWD：在 `<Dashboard />` 內加 CSS media queries / grid；三張圖 width / height props 已備好。
  - phase #8 fixture：transform 函式（toCpuSeries / toMemorySeries / toDiskSnapshot）形狀已穩定；fixture 注入只需把 hook 換成「直接餵 array」即可。
- **可能破壞**：
  - stage 5 archived spec scenario 「App calls /api/metrics/cpu exactly once during mount」必須 MODIFY；archived spec 透過 delta 同步即會被覆寫。
  - 任何依賴「useCpu 不會重複呼叫 fetch」的後續測試或邏輯（目前無）需配合調整。
