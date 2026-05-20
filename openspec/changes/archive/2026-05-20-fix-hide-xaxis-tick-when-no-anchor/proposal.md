## Why

`polish-chart-axis-spacing-and-stable-ticks` archive 後在 dashboard 觀察前 ≤ 15 秒，發現 CPU/Memory X 軸顯示真實資料 timestamp（如 `15:29:46 / 15:29:48 / 15:29:51`），且每 2 秒輪詢時全部跳掉——和 archive 前的瑕疵幾乎一樣。原因是 Recharts 把 `<XAxis ticks={[]}>` 視為「未指定」並回退到 auto-generated ticks。spec 已要求「不得依賴 Recharts 自動計算 ticks」，但實作沒到位。

## What Changes

- CpuChart、MemoryChart 在 `<XAxis>` 加上條件式 `tick`：當算出的 anchored ticks 陣列為空（含 `data=[]` 與「span 內沒有任何 15s 倍數」兩種情況）時，傳 `tick={false}`，明確抑制 Recharts 的 fallback tick 渲染；其它情況維持原行為。
- 既有的 `ticks` 計算、`tickFormatter`、`padding`、margin、`<YAxis>`、Disk 圖 X 軸、`ResponsiveContainer` 禁用、heading、empty-data、time-zone formatting 等行為一律保留。

非範圍：不調整 polling 間隔、不調 `METRIC_HISTORY_LIMIT`、不改 `domain`、不引入新依賴、不動 `DiskChart`（其 X 軸是百分比，不受此問題影響）、不引入軸標題或 `<ResponsiveContainer>`。

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `frontend-app`：MODIFIED 兩條既有 Requirements（`CpuChart X axis renders at most 5 evenly spaced timestamp ticks`、`MemoryChart X axis renders at most 5 evenly spaced timestamp ticks`），在 Requirement body 中追加「ticks 為空時 MUST 傳 `tick={false}`」的條款，並各新增一條 `Short-span data with no anchored multiple produces no X ticks` Scenario。

## Impact

- 程式碼：
  - 修改 `src/components/{Cpu,Memory}Chart.tsx`：抽 `anchoredTicks` const，加 `tick={anchoredTicks.length === 0 ? false : undefined}`。
  - 修改 `src/components/{Cpu,Memory}Chart.fixtures.ts`：新增 `shortSpan` fixture（baseTime + 1s 起 5 列，span 8s，範圍內無 15s 倍數）。
  - 修改 `src/components/{Cpu,Memory}Chart.test.tsx`：新增三個 case（textContent 無 HH:MM:SS、`<XAxis>` `tick` 為 `false`、anchored ticks 存在時 `tick` 不為 `false`）。
  - 可能更新 `src/components/__snapshots__/Dashboard.snapshot.test.tsx.snap` baseline（X 軸 tick 結構變動）。
- 不動：backend、polling hook、`computeAnchoredTimeTicks` 演算法、`formatChartTime`、`toCpuSeries` / `toMemorySeries` / `toDiskSnapshot`、`App.tsx`、CSS、`METRIC_HISTORY_LIMIT`、`VITE_POLL_INTERVAL_MS`、`DiskChart`。
- 依賴：不新增任何 npm 套件。
- Reviewer 驗證：跑 `npm test` 全綠；`node server.js` + `npm start` 後重整 dashboard，前 ≤ 17 秒內 CPU/Memory X 軸應無時間文字；累積過第一個 15s 邊界後 anchored tick 出現並穩定。
