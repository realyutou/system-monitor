## 1. computeAnchoredTimeTicks 工具 (TDD)

- [x] 1.1 🔴 新增 `src/lib/computeAnchoredTimeTicks.test.ts`，覆寫 spec 八個 scenario：non-finite 輸入、`max<min`、區間 < step、剛好 1 step、跨多個 step（`7_000..64_000`）、邊界對齊（`15_000..60_000`）、預設 step 為 15_000、不可變動輸入。執行 `npm test -- computeAnchoredTimeTicks` 確認 fail。
- [x] 1.2 🟢 新增 `src/lib/computeAnchoredTimeTicks.ts`，依 design.md 演算法實作。再跑 `npm test -- computeAnchoredTimeTicks` 確認全綠。
- [x] 1.3 ♻️ 刪除 `src/lib/computeTimeTicks.ts` 與 `src/lib/computeTimeTicks.test.ts`（已被 REMOVED）。

## 2. CpuChart：切換 anchored ticks + margin + padding (TDD)

- [x] 2.1 🔴 更新 `CpuChart.fixtures.ts`：把 `nineRows` 改為 span ≥ 60 秒、跨 ≥ 3 個 15s 倍數的 fixture（例：baseTime 對齊到非 15s 倍數 + 9 列 ≥ 7s/列）。在 `CpuChart.test.tsx`：(a) 刪除舊「nine-row indices 0,2,4,6,8」與「three-row all」case；(b) 新增「至少 3 個 15s 倍數 anchored ticks 出現在 textContent」case；(c) 新增「fixture[1].time 不是 15s 倍數時不出現」case；(d) 新增「empty data 不產出 HH:MM:SS」case；(e) 新增 helper `findAxisProp(element, axisType, propName)` 並驗 `<XAxis>` `padding.left >= 8`；(f) 新增 helper `findChartProp(element, chartType, propName)` 並驗 `<LineChart>` `margin.right >= 16` 與 `margin.left >= 4`。執行 `npm test -- CpuChart` 確認 fail。
- [x] 2.2 🟢 在 `CpuChart.tsx`：(a) 移除 `computeTimeTicks` import，改 import `computeAnchoredTimeTicks`；(b) 在 `<LineChart>` 加 `margin={{ top: 8, right: 24, bottom: 8, left: 8 }}`；(c) 在 `<XAxis>` 把 `ticks` 改為 `computeAnchoredTimeTicks(data[0]?.time ?? 0, data[data.length - 1]?.time ?? 0)`、加 `padding={{ left: 12, right: 12 }}`。`npm test -- CpuChart` 全綠。

## 3. MemoryChart：切換 anchored ticks + margin + padding (TDD)

- [x] 3.1 🔴 同 §2 套用到 `MemoryChart.fixtures.ts`（`nineRows` 改為 span ≥ 60 秒、跨 ≥ 3 個 15s 倍數）與 `MemoryChart.test.tsx`（同 §2.1 a–f）。fail。
- [x] 3.2 🟢 在 `MemoryChart.tsx` 套用同 §2.2 a–c 的修改。綠。

## 4. DiskChart：margin (TDD)

- [x] 4.1 🔴 在 `DiskChart.test.tsx` 新增「`<BarChart>` `margin.right >= 16`」case（重用 §2.1f helper）。fail。
- [x] 4.2 🟢 在 `DiskChart.tsx` 加 `margin={{ top: 8, right: 24, bottom: 8, left: 8 }}`。綠。

## 5. 全域驗證

- [x] 5.1 跑 `npm test` 全綠（含 Dashboard.snapshot 因 margin/padding 重排，跑 `npm test -- -u Dashboard.snapshot` 重 baseline）。
- [x] 5.2 跑 `openspec validate polish-chart-axis-spacing-and-stable-ticks --strict` 通過。
- [x] 5.3 手動驗證：`node server.js` 與 `npm start` 同時跑，於 dashboard 觀察 ≥ 30 秒，確認：CPU/Memory X 軸 tick label 對齊到「整 15 秒」、每 2 秒輪詢時 label 多數不變、第一個 X tick 與 `0 %` 之間有間距、最後一個 X tick 完整顯示；Disk 圖 `100 %` 完整顯示。
- [x] 5.4 用 claude-in-chrome 截 dashboard 三張圖（before/after 對比），附於 PR 描述。

## 6. Archive

- [x] 6.1 確認所有 task 勾選 + reviewer 同意後，跑 `openspec archive polish-chart-axis-spacing-and-stable-ticks -y`，將 delta 併回主 spec。
