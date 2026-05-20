## Why

`add-chart-axis-units-and-fixed-ticks` archive 後手動驗證 dashboard 暴露三個視覺缺陷：(1) CPU/Memory X 軸 tick label 每 2 秒輪詢全部刷新（如 `14:53:19/33/49/…` → `14:53:21/35/51/…`），整個軸視覺上漂移；(2) 三張圖第一個 X tick 緊貼 Y 軸 `0 %`，數字幾乎重疊；(3) 最後一個 X tick 的 `HH:MM:SS` 寬度超出 plot 區被截斷（截圖看到 `14:54:1...`）。這些缺陷由 Recharts 預設 margin/padding + tick 來源是「真實資料 timestamps」的設計組合造成，需要追加要求。

## What Changes

- 新增純函式 `src/lib/computeAnchoredTimeTicks(min, max, step = 15_000)`：在 `[min, max]` 區間內取 `step` 的整數倍時間點作為 tick，使 tick label 對齊到「整 15 秒」並隨輪詢只在邊界跨越時更新。
- CpuChart、MemoryChart 的 `<XAxis ticks>` 由 `computeTimeTicks(data.map(d => d.time))` **改為** `computeAnchoredTimeTicks(dataMin, dataMax)`；行為差異：早期資料不滿 15s 時 X 軸暫無 tick，這是 trade-off。
- 刪除舊的 `src/lib/computeTimeTicks.ts` 與其測試（被取代）。
- 三張圖（CpuChart、MemoryChart、DiskChart）的 `<LineChart>`/`<BarChart>` 加 `margin={{ top: 8, right: 24, bottom: 8, left: 8 }}`，使最後一個 tick label 不被截、上下不擠。
- CpuChart、MemoryChart 的 `<XAxis>` 加 `padding={{ left: 12, right: 12 }}`，使第一個與最後一個資料點不貼軸邊。
- 既有 `tickFormatter`（`%` 與 `formatChartTime`）、`<YAxis>` domain `[0,100]`、Disk 圖 X domain `[0,100]`、`ResponsiveContainer` 禁用、heading、empty-data、time-zone formatting 等行為一律保留。

非範圍：不調整 polling 間隔、不調 `METRIC_HISTORY_LIMIT`、不引入軸標題、不引入 `<ResponsiveContainer>`、不重設計 chart card RWD/CSS。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `frontend-app`：MODIFIED 三條既有 Requirements（`CpuChart X axis renders at most 5 evenly spaced timestamp ticks`、`MemoryChart X axis renders at most 5 evenly spaced timestamp ticks`、`computeTimeTicks utility selects up to N evenly spaced values from a sorted numeric array` → 改名為 `computeAnchoredTimeTicks` 並改變語意），同時 ADDED 三條 chart margin Requirements 與兩條 XAxis padding Requirements。

## Impact

- 程式碼：
  - 新增 `src/lib/computeAnchoredTimeTicks.ts`、`src/lib/computeAnchoredTimeTicks.test.ts`。
  - 修改 `src/components/{Cpu,Memory,Disk}Chart.tsx`（margin/padding/ticks 切換）。
  - 修改 `src/components/{Cpu,Memory,Disk}Chart.test.tsx` 與 `{Cpu,Memory}Chart.fixtures.ts`（fixture 覆蓋 60s+ span、helper 抽 chart margin/XAxis padding props）。
  - 刪除 `src/lib/computeTimeTicks.ts` 與 `.test.ts`。
  - 更新 `src/components/__snapshots__/Dashboard.snapshot.test.tsx.snap` baseline（SVG 結構因 margin 變動）。
- 不更動：backend、polling hook、`formatChartTime`、`toCpuSeries` / `toMemorySeries` / `toDiskSnapshot`、`App.tsx`、CSS、`METRIC_HISTORY_LIMIT`、`VITE_POLL_INTERVAL_MS`。
- 依賴：不新增任何 npm 套件。
- Reviewer 驗證：跑 `npm test` 全綠；`node server.js` + `npm start` 後在 dashboard 觀察 ≥ 30 秒，CPU/Memory X tick label 對齊到 15s 倍數且每 2s 輪詢時不亂跳；第一個 X tick 與 Y 軸 `0 %` 之間有可見間距；最後一個 X tick 完整顯示。
