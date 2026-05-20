## 1. CpuChart：tick={false} fallback 抑制 (TDD)

- [x] 1.1 🔴 在 `CpuChart.fixtures.ts` 新增 `shortSpan` fixture：`shortSpanBase = baseTime + 1 * sec`、5 列 span 8 秒、範圍內無 15s 倍數。在 `CpuChart.test.tsx` 新增三個 case：(a) `container.textContent` 不含 `HH:MM:SS`；(b) `findAxisProp(element, XAxis, 'tick') === false`；(c) 用既有 `cpu.nineRows`（≥3 anchored ticks）驗 `tick` 不為 `false`。執行 `npm test -- CpuChart` 確認 fail。
- [x] 1.2 🟢 在 `CpuChart.tsx`：把 `computeAnchoredTimeTicks(...)` 抽成 `const anchoredTicks`；`<XAxis>` `ticks={anchoredTicks}` 並加 `tick={anchoredTicks.length === 0 ? false : undefined}`。`npm test -- CpuChart` 全綠。

## 2. MemoryChart：tick={false} fallback 抑制 (TDD)

- [x] 2.1 🔴 同 §1.1 套用到 `MemoryChart.fixtures.ts`（新增 `shortSpan` fixture）與 `MemoryChart.test.tsx`（三條新 case）。fail。
- [x] 2.2 🟢 同 §1.2 套用到 `MemoryChart.tsx`。綠。

## 3. 全域驗證

- [x] 3.1 跑 `npm test` 全綠（Dashboard.snapshot 視需要 `npm test -- -u Dashboard.snapshot` 重 baseline）。
- [x] 3.2 跑 `openspec validate fix-hide-xaxis-tick-when-no-anchor --strict` 通過。
- [x] 3.3 手動驗證：`node server.js` + `npm start` 後**重整** dashboard，前 ≤ 17 秒 CPU/Memory X 軸**無時間文字**；累積過第一個 15s 邊界後 anchored tick 出現並穩定；Disk 圖維持原行為。用 `claude-in-chrome` 截 (a) 剛重整、(b) ≥ 30 秒後兩張對比圖。

## 4. Archive

- [x] 4.1 確認所有 task 勾選 + reviewer 同意後，跑 `openspec archive fix-hide-xaxis-tick-when-no-anchor -y`，將 delta 併回主 spec。
