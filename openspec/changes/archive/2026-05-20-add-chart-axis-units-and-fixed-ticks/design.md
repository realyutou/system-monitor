## Context

三張圖目前都用 Recharts 的預設 tick 行為，沒有任何 `tickFormatter`，所以軸上只能看到純數字。CPU/Memory 的 X 軸又因為 `domain={['dataMin','dataMax']}` 加上自動 tick，每次輪詢資料變動時 Recharts 都會重新挑「整齊」的時間點，呈現上 tick 數量會在 4–7 之間跳動。

constraint：依 `docs/tech-stack.md`，Recharts 是釘住的選型；依 `docs/mission.md` TDD 強制。前置的相關 scenarios（`Y axis is fixed to 0–100`、`mounts even when data is empty`、`local time zone formatting`）已經在 `openspec/specs/frontend-app/spec.md` 上線，本變更不能破壞它們。

## Goals / Non-Goals

**Goals:**
- 讓三張圖的百分比軸顯示 `%`，肉眼立刻看得出單位。
- 讓 CPU/Memory X 軸 tick 數量穩定（≤ 5、首尾 inclusive、視覺等距），減少抖動感。
- 維持 TDD：先紅後綠，新增測試覆蓋新行為。

**Non-Goals:**
- 不加軸標題（"Time"、"Usage"），不引入 Recharts `<Label>`。
- 不引入 `<ResponsiveContainer>`（spec 既有要求不引入）。
- 不變更輪詢頻率、資料歷史長度、時間格式（`formatChartTime`）。
- 不重設計 chart card 樣式、RWD。

## Decisions

### Decision 1：`%` 用 `tickFormatter`，而非 axis label

- 採用：`tickFormatter={(v) => \`${v} %\`}`。
- 替代方案：用 Recharts `<Label>` 在軸旁顯示 "Usage (%)"。
- 理由：tickFormatter 每個刻度都帶單位，最直覺；不增加圖外的留白、不需要調 layout、不影響 `ResponsiveContainer` 禁用規則。Label 方案多一個元件、需要額外定位邏輯。
- spec 上以「`tickFormatter(50)` 必須回傳 endsWith ` %` 的字串」與「DOM textContent 必須包含至少一個 `25 %`/`50 %`/`75 %`/`100 %`」雙重驗證（前者驗實作、後者驗整合）。

### Decision 2：X 軸固定 tick 用純函式 + Recharts `ticks` prop

- 採用：新增 `src/lib/computeTimeTicks.ts`，於 CpuChart/MemoryChart 把 `ticks` 顯式指定。
- 演算法：
  ```ts
  function computeTimeTicks(values: number[], count = 5): number[] {
    if (values.length === 0) return [];
    if (values.length <= count) return [...values];
    const last = values.length - 1;
    return Array.from({ length: count }, (_, i) =>
      values[Math.round((i * last) / (count - 1))],
    );
  }
  ```
- 替代方案 A：只設 `tickCount={5}` —— Recharts 仍會挑「整齊」的時間，不保證 5 個、不保證首尾 inclusive。被否決。
- 替代方案 B：固定 60s 滾動視窗 —— 需要動 X 軸 `domain`，並且小於 60s 的早期狀態會顯示大量空白。被否決，超出本提案範圍。
- 為什麼是純函式：方便單元測試（不需要 RTL）、可在元件外覆用、保持元件 render path 簡短。

### Decision 3：Disk 圖只動 X 軸 `tickFormatter`，不動 Y 軸

- DiskChart 的 Y 軸是 category（掛載點名稱），不適合加單位。本提案只在 X 軸加 `%`，與 CPU/Memory 的百分比軸保持一致。

### Decision 4：用 ADDED 而非 MODIFIED 增訂 spec

- 既有 scenarios（Y/X domain `[0,100]`、`ResponsiveContainer` 禁用、heading、empty-data、time-zone formatting）描述的是「DOM 結構 / 配置」，與新加的 `tickFormatter` / `ticks` 互不衝突。
- 增訂走 `## ADDED Requirements`，不修改既有 requirement 區塊；archive 時可直接 append 到主 spec。

## Risks / Trade-offs

- [Recharts `ticks` prop 與 `domain` 同時生效時，可能截掉端點外的資料] → 我們的 `ticks` 全部來自 `data` 自身的時間戳，必落在 `[dataMin, dataMax]` 域內，不會被截。
- [JSDOM 下 Recharts 的 SVG tick text 渲染順序可能不穩定] → 既有測試已驗證 `container.textContent` 比對策略可行（見 `CpuChart.test.tsx` 的 `18:00:00` 案例），沿用相同策略。
- [`computeTimeTicks` 在輸入未排序時不會排序] → 元件呼叫時傳入 `data.map(d => d.time)`，而 `data` 由 `toCpuSeries` 產出，保留 DTO 原序、時間遞增已由 `Multiple DTOs preserve input order` scenario 保證。`computeTimeTicks` 不需要排序步驟，但會在函式 doc 註記「assumes sorted input」。
- [若日後改為 SSE / WebSocket 推送大批 backlog，5 ticks 可能太稀疏] → 屆時可調 `count` 參數，不影響本提案。

## Migration Plan

無資料遷移、無 API 變更。

部署：合併 PR 即生效。Rollback：revert 該 PR 即可（純前端展示變更）。
