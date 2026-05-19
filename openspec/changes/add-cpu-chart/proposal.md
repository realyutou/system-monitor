## Why

`docs/roadmap.md` 階段 #5 要求在前端落下第一張 Recharts 圖：建立 `<CpuChart>` 元件、把頁面層的 fetch 從 `/healthz` 擴展到也呼叫一次 `/api/metrics/cpu`，並把 API DTO → chart row 的轉換抽成 `toCpuSeries()` 純函式。此 change 同時建立 phase #6（polling + memory/disk 圖）與 phase #8（fixture 注入）所需的元件 / hook / 純函式三個整合點，但守住 roadmap §跨階段紀律的「靜態 fetch 一次」邊界，不偷渡 polling 行為。

## What Changes

- 新增 runtime dep：`recharts ^2`（前端圖表函式庫，`docs/tech-stack.md` §Frontend 已釘）。
- 新增 `src/components/CpuChart.tsx`：`<CpuChart data={rows} width? height? />`，內含 Recharts `<LineChart>` + `<XAxis>` + `<YAxis domain={[0, 100]}>` + `<Line dot>`；`data` 為 `CpuChartRow[]`（型別與 `toCpuSeries` 共用）。
- 新增 `src/components/CpuChart.test.tsx`：RTL render `<CpuChart data={fixtures.cpu.idle} />`，斷言 Recharts 渲染出 `<path>`（line）與 axis tick；TDD red 階段先 fail。
- 新增 `src/components/CpuChart.fixtures.ts`：export `cpu.idle`，包含 ≥ 3 個 `{ time, usage }` 點，數值落在 5–15% 區間反映「閒置」語意；phase #8 再決定是否搬到 `tests/fixtures/` 並擴充 `medium-load` / `peak`。
- 新增 `src/lib/toCpuSeries.ts`：純函式 `toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[]`，把 `{ usagePercent, cores, timestamp }` 轉成 `{ time: number /* epoch ms */, usage: number }`；array-in / array-out 以利 phase #6 多點輸入直接重用。
- 新增 `src/lib/toCpuSeries.test.ts`：單測：空輸入 → 空陣列；單筆 → 單列、`time === Date.parse(timestamp)`、`usage === usagePercent`；多筆順序保留。
- 新增 `src/hooks/useCpu.ts`：包裝 `getCpu()` + `useState` + `useEffect`，回傳 `{ data: CpuChartRow[] | null; status: 'loading' | 'ok' | 'error' }`；mirror `useHealth.ts` 的 cancelled flag 模式，是 phase #6 `useMetricPolling` 的雛形。
- 修改 `src/lib/api.ts`：export `CPU_ENDPOINT = '/api/metrics/cpu'`、`CpuMetricDto`（`{ usagePercent: number; cores: number; timestamp: string }`）與 zero-arg `getCpu(): Promise<CpuMetricDto>`，沿用既有 `HEALTHZ_ENDPOINT` / `getHealth()` 的零參數風格。
- 修改 `src/App.tsx`：整入 `useCpu()`，把現有 health readout 縮成小角標（header 區小徽章，保留 `Backend: ok` 字樣以保護 phase #4 既有斷言），主視覺區塊改放 `<CpuChart data={cpu.data ?? []} />`；loading / error 狀態以已 mount 的 CpuChart 容器（空 series）配合 status 文字呈現。
- 修改 `src/App.test.tsx`：既有三個 RTL case（happy / error / loading）保留並擴充 fetch mock —— 除 `/healthz` 外再 stub `/api/metrics/cpu`；新增至少一個 case 斷言 chart 容器（如 `getByTestId('cpu-chart')`）出現。
- 修改 `src/App.module.css`：加入 header / main 兩區塊版面（簡單 flex / grid 排列，**不**啟動 media queries —— 那屬於 phase #7）；保留現有 readout 樣式給縮小後的徽章；為 chart 容器設定明確 width / height 避免 Recharts 在 jsdom 警告。
- 修改 `package.json`：`dependencies` 新增 `recharts`。
- **鎖定的決策**：
  - Chart row 形狀：`{ time: number /* epoch ms */, usage: number }`；`time` 採 epoch ms 而非 ISO 字串，因 Recharts XAxis `type="number"` + `tickFormatter` 處理時序更穩定；ISO 字串保留在 DTO 層。
  - `toCpuSeries` API：`(dtos: CpuMetricDto[]): CpuChartRow[]`（array-in / array-out），phase #5 餵 `[dto]` 得單列，phase #6 直接餵累積過的 array。
  - `useCpu()` 介面：與 `useHealth()` 對稱回 `{ data, status }`；fetch 一次後不再呼叫，不啟動 interval（守住「靜態 fetch」邊界）。
  - Y 軸固定 `domain={[0, 100]}`：避免單一 sample 時 Recharts auto-fit 到 `[usagePercent, usagePercent]` 使圖表沒有上下文。
  - `<Line dot>` 啟用：phase #5 靜態 fetch 只有單點，dot 必須顯示否則瀏覽器驗證會看到空 chart。
  - jsdom + Recharts：測試直接傳固定 `width` / `height` props 給 `<CpuChart>`，不使用 `<ResponsiveContainer>` 包裝（避免 jsdom 量不到尺寸）；正式頁面層在 `App.tsx` 給定確切寬高。
  - Fixture 位置：co-located 在 `src/components/CpuChart.fixtures.ts`；phase #8 再決定是否搬遷與擴充。
  - App 版面：health 縮成小角標 + CPU chart 為主視覺；既有 `Backend: ok` 字樣與三個 RTL case 不破。
  - fetch mock：續用 `vi.stubGlobal('fetch', ...)` 模式，依 URL 分支 stub 兩條 endpoint，不引入 `msw`。
- **非變更**：
  - 不引入 polling / `setInterval` / `useMetricPolling`（phase #6）。
  - 不加 memory / disk 圖（phase #6）。
  - 不引入 `<Dashboard>` 容器（phase #6）。
  - 不引入 `<ResponsiveContainer>` 與 RWD media queries（phase #7）。
  - 不建立 `tests/fixtures/` 目錄（phase #8）。
  - 不修改 `server.js` / `server/metricsRouter.js` / `tests/server/*`（後端 CPU API 已在 `add-cpu-metric` 完成）。
  - 不修改 `docs/mission.md` / `docs/tech-stack.md` / `docs/roadmap.md` / `CLAUDE.md`（constitution 已預先支援）。
  - 不引入 `msw`、API mock library、Service Worker。

## Capabilities

### New Capabilities
<!-- 無：本 change 不引入新的 capability。`frontend-app` 已存在；本 change 擴充其 requirements。 -->

### Modified Capabilities
- `frontend-app`: 擴充對外契約：(a) 頁面層除 `/healthz` 外亦會呼叫一次 `/api/metrics/cpu`；(b) 提供 `<CpuChart data={rows} />` Recharts 元件；(c) 提供 `toCpuSeries(dtos): rows` 純函式；(d) `src/lib/api.ts` 新增 `CPU_ENDPOINT` / `CpuMetricDto` / `getCpu()`；(e) 新增 `useCpu()` hook（與 `useHealth()` 對稱）。phase #4 既有的 `Backend: ok` 顯示契約保留。

## Impact

- **新增檔案**：
  - 前端原始碼：`src/components/CpuChart.tsx`、`src/components/CpuChart.test.tsx`、`src/components/CpuChart.fixtures.ts`、`src/hooks/useCpu.ts`、`src/lib/toCpuSeries.ts`、`src/lib/toCpuSeries.test.ts`。
  - openspec：`openspec/changes/add-cpu-chart/{proposal.md, design.md, tasks.md, specs/frontend-app/spec.md}`。
- **既有檔案修改**：
  - `src/lib/api.ts`：新增 `CPU_ENDPOINT`、`CpuMetricDto`、`getCpu()`。
  - `src/App.tsx`：整入 `useCpu()` + `<CpuChart />`；保留 `Backend: ok`。
  - `src/App.test.tsx`：擴充 fetch mock 至兩條 endpoint；新增 chart 渲染斷言。
  - `src/App.module.css`：header / main 版面 + chart 容器尺寸。
  - `package.json`：`dependencies` 新增 `recharts`。
- **npm 相依**：新增 1 個 runtime dep `recharts`；無新 devDep。
- **目錄結構**：repo 第一次出現 `src/components/` 子目錄；後續 phase #6 的 `<MemoryChart>` / `<DiskChart>` / `<Dashboard>` 會擴充本目錄。
- **流程影響**：
  - Reviewer 驗證 phase #5：兩個 terminal，A 跑 `node server.js`、B 跑 `npm start`，瀏覽器看到 header 小徽章「Backend: ok」+ 主區塊出現 Y 軸 0–100、X 軸時間刻度、單一 dot 的 CPU chart。
  - `npm test` 同時跑 jsdom（前端）與 node（後端），新增 `cpu-chart` / `toCpuSeries` / 擴充 `App` 三組測試；既有 `healthz` / `cpu` / `memory` / `disk` / 既有 `App` 斷言全綠。
- **解鎖**：
  - phase #6 polling：`useMetricPolling` 直接 mirror `useCpu()`；memory / disk chart 鏡像 `<CpuChart>`；`toCpuSeries` 的 array-in / array-out 簽名直接套累積資料。
  - phase #7 RWD：在 `<CpuChart>` 已有的 width / height props 上加 `<ResponsiveContainer>` 或 media query。
  - phase #8 fixture：`src/components/CpuChart.fixtures.ts` 的 `idle` 可平移到 `tests/fixtures/cpu.ts` 並擴 `medium-load` / `peak`。
