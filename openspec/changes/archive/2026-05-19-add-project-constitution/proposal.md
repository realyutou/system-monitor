## Why

`system-monitor` 目前只有 `BACKGROUND.md` 作為功能綱要，缺乏一份共享的「為什麼 / 用什麼 / 先做什麼」決策依據。直接開始實作會讓技術選型、開發紀律、階段順序在後續對話中反覆協商，浪費時間並造成不一致。因此先建立放在 `docs/` 的「專案憲法」三份文件，為後續所有實作鎖定單一真相來源。

## What Changes

- 新增 `docs/mission.md`：釘住專案定位（教學 / 作品集 demo）、目標受眾、成功定義、非目標，並把「TDD 強制」列為品質原則。
- 新增 `docs/tech-stack.md`：明列前端（React + TypeScript + Recharts）、後端（Node.js + `systeminformation`/`os`）、測試（Vitest + Supertest + React Testing Library），並記錄為何不選 NetData / Chart.js / Jest。
- 新增 `docs/roadmap.md`：將實作切成 6–8 個極小階段，每階段以 Red → Green → Refactor 三步呈現，符合 TDD 規範。
- `README.md` 補一行指向 `docs/`（如有需要）。
- **非變更**：本 change 不寫任何 React/Node 執行程式碼；那會留給後續以 `roadmap.md` 為藍本的逐階段 change。

## Capabilities

### New Capabilities
- `project-constitution`: 規範 `docs/` 中三份「憲法」文件的存在、章節結構與品質要求；任何後續實作 change 都必須與其一致。

### Modified Capabilities
<!-- 無：尚未有任何既存 capability -->

## Impact

- **新增檔案**：`docs/mission.md`、`docs/tech-stack.md`、`docs/roadmap.md`。
- **既有檔案**：`README.md`（可能加一行連結至 `docs/`）。
- **無程式碼依賴變動**：本 change 不引入 npm 套件或 build 工具。
- **流程影響**：之後所有 `/opsx:propose` 必須引用 `docs/` 中的決策；違背憲法的提案需先修訂憲法 change。
