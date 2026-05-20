## Context

`polish-chart-axis-spacing-and-stable-ticks` 已將 `<XAxis ticks>` 改為 `computeAnchoredTimeTicks(min, max)`，並在 spec 明文「不得依賴 Recharts 的自動 tick 計算」。但在 dashboard 觀察前 15 秒，仍見到原始資料 timestamp 流動的 tick（如 `15:29:46/48/51`）。逐項排查後確認：當 `computeAnchoredTimeTicks` 回傳 `[]`，Recharts 對 `ticks` prop 等於 `[]` 的判斷與 `undefined` 一致，會走 fallback 路徑自動取 ticks。

Constraint：

- `docs/tech-stack.md` 釘住 Recharts；`docs/mission.md` 強制 TDD。
- 不能破壞既有 scenario：domain `['dataMin', 'dataMax']`、`ResponsiveContainer` 禁用、heading、`mounts even when data is empty`、`local time zone formatting`、`%` tickFormatter、Disk 圖 X axis `%`、margin/padding、anchored ticks for 60s+ fixture。
- spec 既有「Empty data produces no X ticks」Scenario 預期 `data=[]` 時 textContent 不含 HH:MM:SS——目前實作其實在 jsdom 下也是過的（empty data 時 Recharts 不 render 任何 axis 內容），故該 Scenario 仍綠；但 spec 意圖（「ticks=[] 一律不渲染 fallback」）尚未由實作完整覆蓋，瀏覽器才會暴露差異。

## Goals / Non-Goals

**Goals:**

- 當 `computeAnchoredTimeTicks` 回傳 `[]`，CpuChart / MemoryChart 的 `<XAxis>` MUST 不渲染任何 tick label / tick 線——含 fallback。
- 維持 TDD：先紅後綠，新增測試覆蓋 short-span 與 anchored 兩種狀態。
- 既有 anchored ticks 行為、margin/padding、Y 軸百分比、Disk 圖、Dashboard snapshot 全數保留。

**Non-Goals:**

- 不引入 `<ResponsiveContainer>` 或 `<Label>`、不加軸標題、不引入新依賴。
- 不調整 `domain`（仍是 `['dataMin','dataMax']`）。
- 不重設計 chart card / CSS / 字體 / 顏色。
- 不修 `DiskChart`（其 X 軸是百分比域，不會走到 anchoredTicks=[] 分支）。

## Decisions

### Decision 1：`tick={false}` 是 Recharts 的正確「關掉 tick 渲染」開關

採用：在 `<XAxis>` 加 `tick={anchoredTicks.length === 0 ? false : undefined}`。

Recharts `<XAxis>` 的 `tick` prop 文件型別為 `Boolean | Object | ReactElement | Function`：

- `true`（預設）→ 渲染 tick label + tick 線。
- `false` → **不**渲染 tick label 與 tick 線。
- Object / Element / Function → 自訂 tick 樣式。

`tick={false}` 不影響 axis line（由 `axisLine` 控制，預設 `true`，本提案不動），也不影響 padding/margin。Recharts 內部走「render 與否」分支時看的是 `tick` 而非 `ticks`，因此 fallback ticks 也會一併消失。

替代方案 A：在 `ticks=[]` 時改傳 `ticks={[Number.NEGATIVE_INFINITY]}` 之類 sentinel。否決：行為未定義、易產生視覺殘留、難測。
替代方案 B：條件式整個拿掉 `<XAxis>`。否決：會造成 plot 區重排與 Dashboard.snapshot 大規模 churn，且失去 axis line 視覺對齊。
替代方案 C：寫自訂 tick component 回傳 `null`。否決：相當於 `tick={false}` 但繁複。

### Decision 2：把 `computeAnchoredTimeTicks(...)` 抽成 `const anchoredTicks`

採用：在 component 內把計算結果存成 const，`ticks` 與 `tick` 兩個 prop 共用同一個結果。

理由：避免兩個 prop 各自計算造成不一致；測試也能直接比對「ticks 與 tick 是否同步」。

### Decision 3：spec delta 全部用 MODIFIED 兩條 Requirement

採用：MODIFIED `CpuChart X axis renders at most 5 evenly spaced timestamp ticks`（追加 `tick={false}` 條款 + 新 Scenario）；MODIFIED `MemoryChart X axis ...`（同上）。

理由：

- 原 Requirement 標題仍精準描述行為（「at most 5」涵蓋 0 的情況）。
- 只動 body 文字、追加 Scenario，無需 ADDED / REMOVED。
- DiskChart 的 X 軸是百分比，沒有 anchored ticks 問題，不需動。

### Decision 4：fixture 設計與測試結構

`shortSpan` fixture：

- `baseTime` 已是 15s 倍數（10:00:00 UTC），偏 +1s 作為 `shortSpanBase`，產生 5 列 span 8s 的資料。
- 範圍 `[baseTime+1s, baseTime+9s]` 內無 15s 倍數（前一個是 `baseTime`、下一個是 `baseTime+15s`，皆在區間外），故 `computeAnchoredTimeTicks` 回 `[]`。
- 與既有 `idle` fixture 不衝突，因為 `idle` 從 `baseTime` 開始，計算結果為 `[baseTime]`（1 個 anchored tick）。

測試（CpuChart 與 MemoryChart 各加三條）：

1. `does not render any HH:MM:SS substring when data span has no 15s multiple`（DOM-level，跨時區）。
2. `passes tick={false} to XAxis when no anchored ticks fall in range`（props-level，用既有 `findAxisProp` helper）。
3. `does not pass tick={false} to XAxis when anchored ticks exist`（props-level，正反面對照）。

## Risks / Trade-offs

- 早期 0–17s 視窗 X 軸沒有時間文字 → 已在 [add-chart-axis-units-and-fixed-ticks] 後續 design.md 揭露 trade-off；本次只是把實作對齊 spec。
- Recharts 版本升級可能改變 `tick={false}` 行為 → 本提案的 test (2) 是 props-level 斷言，先綁定我們的呼叫；render-level test (1) 是行為斷言，可早期發現升級回歸。
- Dashboard.snapshot baseline 可能因「empty-data 不再有 fallback tick g 節點」些微 churn → 跑 `npm test -- -u Dashboard.snapshot` 即可。

## Migration Plan

無資料遷移、無 API 變更。

部署：合併 PR 即生效。Rollback：revert 該 PR 即可（純前端展示變更）。
