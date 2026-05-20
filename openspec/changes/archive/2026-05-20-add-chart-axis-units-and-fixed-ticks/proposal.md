## Why

Dashboard 三張圖（CPU / Memory / Disk）的衡量單位都是百分比，但 Recharts 預設 tick 只顯示純數字（`0`、`25`、`50` …）。reviewer 一眼看不出單位，Disk 圖的橫向 bar 長度甚至容易被誤解成 GB。

此外 CPU/Memory 的 X 軸（時間戳）目前用 `domain={['dataMin','dataMax']}` 搭配 Recharts 自動 tick，輪詢累積資料時 tick 數量會在 4–7 個之間跳動，視覺上不穩定。

## What Changes

- CpuChart、MemoryChart 的 `<YAxis>` 加上 `tickFormatter`，刻度顯示為 `"<v> %"`。
- DiskChart 的 `<XAxis>` 加上 `tickFormatter`，刻度顯示為 `"<v> %"`。
- CpuChart、MemoryChart 的 `<XAxis>` 改用 `ticks` prop，傳入由新純函式 `computeTimeTicks(values, 5)` 計算的時間戳陣列；輸入 ≤ 5 點時回傳全部，> 5 點時取首尾 inclusive 的 5 個等距索引位置。
- 新增 `src/lib/computeTimeTicks.ts`（純函式 + 對應單元測試）。
- 既有 scenarios（Y/X domain `[0,100]`、`ResponsiveContainer` 禁用、heading、`mounts even when data is empty`、local time zone formatting）一律保留，本提案只 ADDED Requirements。

非範圍（明確不做）：
- 不加軸標題（"Time"、"Usage"）。
- 不處理空狀態 / 載入狀態 UI、不調整 chart card 間距 / RWD / CSS。
- 不改 polling、`METRIC_HISTORY_LIMIT`、`formatChartTime`、資料轉換層。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `frontend-app`: 為 CpuChart、MemoryChart、DiskChart 與新工具函式 `computeTimeTicks` 追加 ADDED Requirements。不修改既有 scenarios。

## Impact

- 程式碼：
  - 新增 `src/lib/computeTimeTicks.ts`、`src/lib/computeTimeTicks.test.ts`。
  - 修改 `src/components/CpuChart.tsx`、`src/components/MemoryChart.tsx`、`src/components/DiskChart.tsx`（各加一個 `tickFormatter`；CPU/Memory 另加 `ticks` prop）。
  - 對應 3 份 `*.test.tsx` 補測試案例。
- 不更動：backend、polling hook、`formatChartTime`、`toCpuSeries` / `toMemorySeries` / `toDiskSnapshot`、`App.tsx`、CSS。
- 依賴：不新增任何 npm 套件。
- Reviewer 驗證：跑 `npm test` 全綠、`npm start` + `node server.js` 後在 http://localhost:5173 目視確認三張圖刻度顯示 `%` 與 CPU/Memory X 軸恆為 ≤ 5 個 tick。
