## 1. Scaffold docs directory

- [x] 1.1 在專案根目錄建立 `docs/` 目錄（若已存在則略過）

## 2. Write docs/mission.md

- [x] 2.1 撰寫「定位」段落：一句話宣告本專案為「教學 / 作品集 demo」
- [x] 2.2 撰寫「目標受眾」段落：列出評閱者、未來雇主、學習中的自己
- [x] 2.3 撰寫「成功定義」段落：對應 README 驗證步驟（< 2s 首屏、即時更新、RWD、≥ 3 測試情境）
- [x] 2.4 撰寫「非目標」段落：明列不做多用戶、認證、長期儲存、告警
- [x] 2.5 撰寫「品質原則」段落：明文寫出「先寫測試再改 code」（red → green → refactor）為強制紀律

## 3. Write docs/tech-stack.md

- [x] 3.1 撰寫「Frontend」段落：React 18 + TypeScript + Vite + Recharts；測試 Vitest + React Testing Library + `@testing-library/jest-dom`
- [x] 3.2 撰寫「Backend」段落：Node.js 20 + `systeminformation`（首選）/ `node:os`（fallback）；測試 Vitest + Supertest；HTTP 框架待 roadmap 階段 1 敲定
- [x] 3.3 撰寫「資料流」段落：polling `/api/metrics/*`（預設 2s），超標才升級 SSE/WebSocket
- [x] 3.4 撰寫「效能預算」段落：首屏 < 2s、API < 100ms（本機）
- [x] 3.5 撰寫「取捨記錄」段落：各 2–3 句說明為何不選 NetData / Chart.js / Jest

## 4. Write docs/roadmap.md

- [x] 4.1 建立表格欄位：`目標 | 🔴 Red（先寫測試） | 🟢 Green（最小實作） | ♻️ Refactor | 驗證指令`
- [x] 4.2 階段 1：Backend skeleton + `/healthz`（Supertest 200 測試 → 起 server）
- [x] 4.3 階段 2：CPU metric API（契約 shape 測試 → 接 `systeminformation`）
- [x] 4.4 階段 3：Memory + Disk metric API（每 endpoint red→green→refactor）
- [x] 4.5 階段 4：Frontend skeleton + 呼叫 `/healthz`（RTL render 測試 → Vite + fetch）
- [x] 4.6 階段 5：第一張 Recharts 圖（fixture 渲染測試 → 接 CPU API）
- [x] 4.7 階段 6：即時更新 polling + 多圖（fake timers 測試 → 實作 polling）
- [x] 4.8 階段 7：RWD + 效能驗證（DevTools < 2s + 三種視窗寬度 + 關鍵 snapshot）
- [x] 4.9 階段 8：≥ 3 個 test scenarios fixtures + 對應 Vitest 案例
- [x] 4.10 確認最終階段數落在 6–8 之間（合併或拆分以符合 spec）

## 5. Link from README

- [x] 5.1 在 `README.md` 適當位置加一行「See `docs/` for project constitution」連結（含三個檔名）

## 6. Verify against spec

- [x] 6.1 對照 `specs/project-constitution/spec.md` 逐條 scenario 自我檢查（六個 scenario 全部通過）
- [x] 6.2 執行 `openspec status --change add-project-constitution` 確認 `tasks` 為 `done`
- [x] 6.3 將本次 TDD 規範寫入 `~/.claude/projects/-Users-ted-projects-system-monitor/memory/feedback_tdd_first.md`（若尚未存在）並於 `MEMORY.md` 索引登錄
