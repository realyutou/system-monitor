## Context

`add-chart-axis-units-and-fixed-ticks` archive 後在 dashboard 觀察 ≥ 30 秒，看到三個瑕疵：(1) CPU/Memory X 軸 5 個 tick label 每 2 秒輪詢全部更新 — 因為 `computeTimeTicks(data.map(d => d.time))` 的輸入每次都不同；(2) 第一個 X tick 緊貼 Y 軸 `0 %` 標籤；(3) 最後一個 X tick `HH:MM:SS` 被截斷。

Constraint：

- `docs/tech-stack.md` 釘住 Recharts；`docs/mission.md` 強制 TDD。
- 既有 6 條 ADDED Requirements 已落在 `openspec/specs/frontend-app/spec.md`（archive commit `c01eccd`）。本變更可以 MODIFIED 其中兩條 (CpuChart/MemoryChart X axis)、REMOVE 一條 utility (computeTimeTicks)、ADDED 新 utility 與五條 margin/padding。
- 不能破壞既有 scenario：Y/X domain `[0,100]`、`ResponsiveContainer` 禁用、heading、`mounts even when data is empty`、`local time zone formatting`、`%` tickFormatter、Disk 圖 X axis `%`。

## Goals / Non-Goals

**Goals:**
- CPU/Memory X 軸 tick label 對齊到「整 15 秒」，視覺上輪詢時 label 大多數時間不動，只在跨越 15s 邊界才左掉一個、右進一個。
- 三張圖的 plot 區與軸標籤之間有可見間距，第一個 X tick 不撞 Y 軸 `0 %`、最後一個 X tick 完整顯示、Disk 圖 `100 %` 完整顯示。
- 維持 TDD：先紅後綠，新增測試覆蓋新行為。

**Non-Goals:**
- 不引入 `<ResponsiveContainer>` 或 `<Label>`、不加軸標題、不引入新依賴。
- 不調 polling 間隔 / `METRIC_HISTORY_LIMIT` / `formatChartTime`。
- 不重設計 chart card RWD / CSS / 字體 / 顏色。

## Decisions

### Decision 1：tick 錨點演算法用純函式 + Recharts `ticks` prop

採用：新增 `src/lib/computeAnchoredTimeTicks.ts`，簽名 `(min: number, max: number, step?: number) => number[]`，預設 `step = 15_000`（15 秒）。

演算法：
```ts
function computeAnchoredTimeTicks(min: number, max: number, step = 15_000): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return [];
  const first = Math.ceil(min / step) * step;
  const last = Math.floor(max / step) * step;
  if (last < first) return [];
  const ticks: number[] = [];
  for (let t = first; t <= last; t += step) ticks.push(t);
  return ticks;
}
```

CpuChart/MemoryChart 在元件內呼叫 `computeAnchoredTimeTicks(data[0]?.time ?? 0, data[data.length - 1]?.time ?? 0)`（空 data 走 short-circuit 回 `[]`）。

替代方案 A：保留 `computeTimeTicks`，把參數從 timestamps 改為「相對位置 ratios」。否決：仍是「資料驅動」會飄；對齊到「整齊秒」才能穩定。
替代方案 B：固定 60s 滾動視窗 + 五個相對 tick (`-60s/-45s/-30s/-15s/0s`)。否決：需要動 X 軸 `domain`、改變既有 `[dataMin, dataMax]` 的 scenario，且早期不滿 60s 時左側留大量空白。本方案讓 `domain` 行為不變，只改 `ticks`。
替代方案 C：`tickCount={5}` + 讓 Recharts 自選。否決：archive 的 spec 已明確禁止依賴自動 tick。

15s step 的選擇：dashboard 預設 `POLL_INTERVAL_MS = 2000`、`METRIC_HISTORY_LIMIT = 30`，視窗 ≈ 60 秒；15s 切 4 段，加上首尾對齊不一定產生 4 個 tick，多數時間 3–4 個 tick，仍符合 spec 既有「≤ 5 ticks」。

行為差異（trade-off）：早期資料 < 15s 時 `last < first`，X 軸暫時無 tick；累積到第一個 15s 邊界出現後才開始顯示。reviewer 觀察 ≥ 30 秒已遠超此期間，不影響驗收。已在 proposal 揭露。

### Decision 2：刪除舊 `computeTimeTicks` 工具，不保留向後相容

採用：刪除 `src/lib/computeTimeTicks.ts` / `.test.ts`，spec 用 REMOVED 退役該 Requirement。

理由：舊函式輸入 `(values, count)`、新函式輸入 `(min, max, step)`，語意完全不同；保留兩個函式只會迷惑後續維護者。專案還在發展中（per `docs/mission.md`），沒有外部消費者，無向後相容包袱。

### Decision 3：margin/padding 數值

採用：三張圖 `<LineChart>`/`<BarChart>` 加 `margin={{ top: 8, right: 24, bottom: 8, left: 8 }}`；CPU/Memory 的 `<XAxis>` 額外加 `padding={{ left: 12, right: 12 }}`。

數值依據：
- `right: 24` ≈ `HH:MM:SS` 8 字 × ~3px/char 半寬 = 12px，再給 12px 留白；經 dashboard 截圖目視確認最後一個 tick `14:54:1...` 被截約 8–10px。
- `left: 8` 配合 XAxis `padding.left: 12` 共 20px，讓第一個資料點與 Y 軸 `0 %` label 拉開 ≥ 16px 視覺距離。
- `top/bottom: 8` 避免 line dot 撞上下緣（小調整，不影響既有 scenario）。

DiskChart 沒有 XAxis padding（資料是 `[0, 100]` 線性，不會貼軸邊），只加 chart margin 解決 `100 %` 截斷。

替代方案：在 CSS `.chartCard` 加 padding。否決：影響範圍超出本提案、會改 RWD scenario；Recharts margin 才是 SVG 內部 plot 區的「正確處」。

### Decision 4：spec delta 用 MODIFIED + REMOVED + ADDED 混合

- CpuChart/MemoryChart 的 X 軸 Requirement 標題不變（仍是「renders at most 5 evenly spaced timestamp ticks」），body 改寫成 anchored 行為 → **MODIFIED**。
- `computeTimeTicks` 工具 Requirement 標題包含函式名稱，無法只改 body → **REMOVED**（含 Reason / Migration）+ ADDED 新 Requirement `computeAnchoredTimeTicks utility ...`。
- 三條 chart margin、兩條 XAxis padding → 全新行為 → **ADDED**。

## Risks / Trade-offs

- [早期資料 < 15s 時 X 軸無 tick] → reviewer 觀察 ≥ 30 秒，這段 idle 期會消失；test 用 fixture 直接跳過此狀態。
- [若日後改 polling 為 1s / 600ms 推送，15s step 太稀疏] → 屆時調 step 參數即可，函式設計已預留。
- [Dashboard.snapshot.test.tsx 的 baseline 會大幅變動] → SVG `<g transform>` 因 margin 重排是預期，跑 `npm test -- -u` 重 baseline。
- [JSDOM 下 Recharts 對 `margin` prop 的渲染保真度] → spec 改驗 `<LineChart>` props 抽出 `margin.right >= 16`、`<XAxis>` props 抽出 `padding.left >= 8`，而非依賴像素級的 DOM 比對；container.textContent 比對策略沿用 archived spec 的成熟模式。

## Migration Plan

無資料遷移、無 API 變更。

部署：合併 PR 即生效。Rollback：revert 該 PR 即可（純前端展示變更）。
