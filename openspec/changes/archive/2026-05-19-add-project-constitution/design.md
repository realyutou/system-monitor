## Context

`system-monitor` 是一個從零開始的 React + TypeScript / Node.js 系統監控儀表板，目前只有 `BACKGROUND.md` 列出功能綱要與審查驗證步驟。專案定位為「教學 / 作品集 demo」，重視 UX、視覺、與可重現的測試情境，**而非**生產級多用戶監控平台。

實作前需要一份共享的決策依據，否則後續每個 feature change 都會在「用什麼套件 / 先做什麼 / 要不要寫測試」上反覆消耗。本 change 透過建立 `docs/` 中的三份「憲法」文件解決這個問題，但**不**動到任何執行碼。

## Goals / Non-Goals

**Goals:**
- 把專案的「為什麼、用什麼、先做什麼」固化成 `docs/mission.md`、`docs/tech-stack.md`、`docs/roadmap.md` 三份檔案。
- 明確宣告「先寫測試再改 code」（TDD red → green → refactor）為專案級紀律，並在 `mission.md` 與 `roadmap.md` 同時呈現。
- 將實作切成 6–8 個極小階段，每個階段都能 end-to-end 驗證，便於審查與作品集展示。
- 把測試框架釘到 Vitest 一統前後端，避免後續再選型。

**Non-Goals:**
- 不在本 change 撰寫任何 React/Node 執行程式碼、設定檔（`package.json`、`vite.config.ts`、`server.js`）或測試。
- 不規範細節 API shape 或 UI 視覺；那由後續以 roadmap 階段為單位的 change 處理。
- 不引入 CI、deployment、observability 工具——皆超出 demo 範圍。
- 不採用 NetData：README 雖允許，但會增加外部相依與學習成本，與 demo 目標相違。

## Decisions

### D1. 三份文件的章節結構

**`docs/mission.md`**
1. *定位* — 一句話陳述「教學 / 作品集 demo」。
2. *目標受眾* — 評閱者、未來雇主、學習自己。
3. *成功定義* — 對應 README 驗證步驟（< 2s 首屏、即時更新、RWD、≥ 3 測試情境）。
4. *非目標* — 不做多用戶、認證、長期儲存、告警。
5. *品質原則* — TDD 強制；每個 PR 必須附對應測試。

**`docs/tech-stack.md`**
1. *Frontend* — React 18 + TypeScript + Vite + Recharts；測試 Vitest + React Testing Library + `@testing-library/jest-dom`。
2. *Backend* — Node.js 20 + Express（或內建 `node:http`，於 roadmap 階段 1 敲定）+ `systeminformation`（首選）/ `node:os`（fallback）；測試 Vitest + Supertest。
3. *資料流* — 前端 polling `/api/metrics/*`（預設 2s 間隔），不引入 WebSocket / SSE 除非效能不達標。
4. *效能預算* — 首屏 < 2s（含 chart render）；API < 100ms（本機）。
5. *取捨記錄* — 為何不選 NetData / Chart.js / Jest（各一段 2–3 句的 rationale）。

**`docs/roadmap.md`**
- 表頭：`# 目標 | 🔴 Red（先寫測試） | 🟢 Green（最小實作） | ♻️ Refactor | 驗證指令`
- 6–8 個階段（暫定 8）：
  1. Backend skeleton + `/healthz`
  2. CPU metric API
  3. Memory + Disk metric API
  4. Frontend skeleton + 串接 `/healthz`
  5. 第一張 Recharts 圖（CPU 折線，靜態 fetch）
  6. 即時更新（polling）+ 多圖
  7. RWD + 效能驗證（< 2s）
  8. 三個以上 test scenarios fixtures + 對應 Vitest 案例

### D2. TDD 強制為品質原則

**選擇**：每個 roadmap 階段都必須以「先寫會失敗的測試」開頭，並在文件中顯式呈現 red→green→refactor 三步。
**理由**：使用者明確指示。亦可作為作品集中可被審視的工程素養證據。
**替代方案**：「重點路徑 TDD（API 與核心 hook 必測，UI 可手動驗證）」——已被使用者否決。

### D3. Vitest 一統前後端

**選擇**：前後端皆用 Vitest；API 用 Supertest，UI 用 React Testing Library。
**理由**：單一 runner 降低設定成本；Vitest 與 Vite 原生整合，watch / coverage 體驗一致；對作品集而言能展示完整測試金字塔。
**替代方案**：
- `node:test` 後端 + Vitest 前端：較輕量，但要維護兩套 reporter / config。
- Jest：與 ES modules 整合需要 transform 設定，且與 Vite 生態漸行漸遠。

### D4. 不引入 NetData

**選擇**：後端直接以 `systeminformation` / `node:os` 採集。
**理由**：減少外部相依與學習成本，貼近「demo / 教學」定位；README 已允許但不要求。
**替代方案**：NetData 代理——指標豐富但需要額外服務與權限，超出 demo 範圍。

### D5. 文件位置與命名

**選擇**：放在 `docs/` 根目錄，名稱不加序號（`mission.md`、`tech-stack.md`、`roadmap.md`）。
**理由**：扁平結構好瀏覽；GitHub 在 repo 首頁即可看到 `docs/` 入口。
**替代方案**：`docs/constitution/` 子資料夾——層級過深，且只有三個檔案。

## Risks / Trade-offs

- **Risk**：憲法寫死後，roadmap 中段如需轉向（例如改用 WebSocket）會牽動文件更新。→ **Mitigation**：在 `tech-stack.md` 取捨段落明寫「polling 是預設、超標才升級 SSE/WebSocket」，留下調整空間而非鎖死。
- **Risk**：8 階段切太細可能讓 reviewer 感到瑣碎。→ **Mitigation**：每階段強制附「驗證指令」一欄；reviewer 可挑階段執行即可。
- **Trade-off**：選擇 Vitest 一統而非 `node:test`，犧牲一點後端輕量度換取一致性與作品集賣相。
- **Trade-off**：不採 NetData，犧牲指標豐富度換取部署簡單與聚焦核心三項（CPU / memory / disk）。

## Open Questions

- Backend HTTP 框架（Express vs `node:http` vs Fastify）——延至 roadmap 階段 1 的 `/healthz` 設計再決定，因為它取決於是否願意引入第一個 npm runtime 相依。
