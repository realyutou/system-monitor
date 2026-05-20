## 1. computeTimeTicks utility (TDD)

- [x] 1.1 🔴 新增 `src/lib/computeTimeTicks.test.ts`，覆寫所有 scenario：空陣列、單元素、長度 = count、長度 < count、九元素回 `[1,3,5,7,9]`、首尾保留、不可變動輸入。執行 `npm test -- computeTimeTicks` 確認 fail。
- [x] 1.2 🟢 新增 `src/lib/computeTimeTicks.ts`，依 design.md 演算法實作。再跑 `npm test -- computeTimeTicks` 確認全綠。
- [x] 1.3 ♻️ 視需要簡化或註記函式假設「assumes sorted input」。

## 2. CpuChart Y 軸 `%`（TDD）

- [x] 2.1 🔴 在 `src/components/CpuChart.test.tsx` 加 2 個 case：抽出 `<YAxis>` `tickFormatter` 驗 `tickFormatter(50)` 與 `tickFormatter(0)` endsWith ` %`；render 後驗 `container.textContent` 包含 `25 %`/`50 %`/`75 %`/`100 %` 之一。執行 `npm test -- CpuChart` 確認 fail。
- [x] 2.2 🟢 在 `src/components/CpuChart.tsx` 為 `<YAxis>` 加 `tickFormatter={(v: number) => \`${v} %\`}`。`npm test -- CpuChart` 全綠。

## 3. CpuChart X 軸 5 ticks（TDD）

- [x] 3.1 🔴 擴充 `CpuChart.fixtures.ts` 加 9 列 fixture（時間嚴格遞增）；在 `CpuChart.test.tsx` 新增 2 個 case：9 列輸入應在 DOM 文字中看到 indices `0,2,4,6,8` 的 `formatChartTime(...)`，不可看到 `1,3,5,7`；3 列輸入應全部出現。執行 `npm test -- CpuChart` 確認 fail。
- [x] 3.2 🟢 在 `CpuChart.tsx` 為 `<XAxis>` 加 `ticks={computeTimeTicks(data.map((d) => d.time))}`。`npm test -- CpuChart` 全綠。

## 4. MemoryChart Y 軸 `%`（TDD）

- [x] 4.1 🔴 在 `src/components/MemoryChart.test.tsx` 加 2 個 case：`tickFormatter(50)` / `tickFormatter(0)` endsWith ` %`，render 後 DOM textContent 包含 `25 %`/`50 %`/`75 %`/`100 %` 之一。fail。
- [x] 4.2 🟢 在 `MemoryChart.tsx` 為 `<YAxis>` 加 `tickFormatter`。綠。

## 5. MemoryChart X 軸 5 ticks（TDD）

- [x] 5.1 🔴 擴充 `MemoryChart.fixtures.ts` 加 9 列 fixture；`MemoryChart.test.tsx` 新增 2 個 case（同 CpuChart）。fail。
- [x] 5.2 🟢 在 `MemoryChart.tsx` 為 `<XAxis>` 加 `ticks={computeTimeTicks(data.map((d) => d.time))}`。綠。

## 6. DiskChart X 軸 `%`（TDD）

- [x] 6.1 🔴 在 `src/components/DiskChart.test.tsx` 加 2 個 case：抽出 `<XAxis>` `tickFormatter` 驗 `tickFormatter(0)` / `tickFormatter(100)` endsWith ` %`；render 後 DOM textContent 包含 `0 %`/`25 %`/`50 %`/`75 %`/`100 %` 之一。fail。
- [x] 6.2 🟢 在 `DiskChart.tsx` 為 `<XAxis>` 加 `tickFormatter`。綠。

## 7. 全域驗證

- [x] 7.1 跑 `npm test` 全綠（含原有 scenario 不退化）。
- [x] 7.2 跑 `openspec validate add-chart-axis-units-and-fixed-ticks --strict` 通過。
- [x] 7.3 手動驗證：`node server.js` 與 `npm start` 同時跑，於 http://localhost:5173 觀察 ≥ 30 秒，確認 CPU/Memory Y 軸刻度顯示 `0 %`–`100 %`、X 軸恆為 ≤ 5 個時間 tick；Disk X 軸顯示 `0 %`–`100 %`。
- [x] 7.4 用 claude-in-chrome 截圖 dashboard 三張圖，附於 PR 描述。

## 8. Archive

- [x] 8.1 確認 task 全部勾選 + reviewer 同意後，跑 `openspec archive add-chart-axis-units-and-fixed-ticks -y` 將 delta 併回主 spec。
