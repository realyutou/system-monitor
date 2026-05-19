# Tech Stack

本文件是 `system-monitor` 的技術選型單一真相來源。任何後續實作 change 都必須與本檔一致；要偏離，先修改本檔。

## Frontend

- **語言 / Framework**：React 18 + TypeScript（嚴格模式 `strict: true`）。
- **建置工具**：Vite。原生 ES modules、快 dev server、與 Vitest 設定共用。
- **圖表函式庫**：Recharts。
- **樣式**：以 CSS Modules 或一般 CSS 為起點；除非 roadmap 後期確認需要，不引入 Tailwind / styled-components。
- **測試**：
  - **Test runner**：Vitest。
  - **元件測試**：React Testing Library。
  - **斷言 / matchers**：`@testing-library/jest-dom`（提供 `toBeInTheDocument` 等）。
  - **使用者互動模擬**：`@testing-library/user-event`。

## Backend

- **Runtime**：Node.js 20 LTS。
- **指標來源**：
  - **首選**：[`systeminformation`](https://www.npmjs.com/package/systeminformation)。跨平台、回傳結構穩定、CPU / memory / disk 一站搞定。
  - **Fallback**：Node 內建 `node:os`（如 `os.cpus()`、`os.freemem()`、`os.totalmem()`），用於 `systeminformation` 不可用或安裝失敗時的退路。
- **HTTP 框架**：**`node:http`（2026-05-19 在 `add-healthz` change 中敲定）**。`server.js` 匯出 `createServer()` 工廠回傳 `http.Server`，Supertest 直接吃 server 物件、`node server.js` 才 listen `PORT = 3001`。選定理由與替代方案見 §取捨記錄〈為何不選 Express / Fastify〉。
- **測試**：
  - **Test runner**：Vitest（與前端共用，降低設定面積）。
  - **API 測試**：Supertest（直接對 Express / `http.Server` 物件呼叫，不需起真實 port）。

## 資料流

- **預設策略**：前端對 `GET /api/metrics/cpu`、`/api/metrics/memory`、`/api/metrics/disk` 做 **polling**，預設間隔 **2 秒**。
- **為何 polling 優先**：實作面積最小、可被 Supertest 完整覆蓋、不需要握手協定，符合 demo 範圍。
- **升級條件**：當下列任一條件成立時，才升級為 SSE 或 WebSocket：
  1. polling 造成首屏 > 2s 或單次 round-trip > 100ms。
  2. 後端採集成本明顯高於 push 一次的成本。
  3. 需要 reviewer 看到「真正即時」（< 1s 延遲）的展示效果。
- 升級必須先在 `tech-stack.md` 與 `roadmap.md` 留下決策紀錄，再開始實作。

## 效能預算

| 指標 | 預算 | 量測方式 |
| --- | --- | --- |
| 首屏（Largest Contentful Paint） | **< 2 秒** | 本機 Chrome DevTools Performance / Lighthouse |
| 單一 metric API 回應 | **< 100 ms**（本機） | Supertest 計時或 `curl -w` |
| Polling 預設間隔 | 2 秒 | 前端常數，可在環境變數覆蓋（roadmap 階段 6 處理） |

超出預算即視為功能 bug，必須在當階段內處理或顯式延後（並留紀錄）。

## 取捨記錄

### 為何不選 NetData

`BACKGROUND.md` 允許以 NetData 作為資料來源，但本專案明確不採用。NetData 是一套完整的 agent + UI 監控系統，把它塞進 demo 等同於同時引入一個外部服務、它的安裝權限、與它的 UI 設計慣例，反而稀釋本作品「自己用 Node.js 採集、自己畫圖」的展示重點。我們選擇直接以 `systeminformation` / `node:os` 採集，把實作面積收斂在一個 repo 內。

### 為何不選 Chart.js

Chart.js 本身輕量好用，但它以 Canvas 為主、React 整合需要 `react-chartjs-2` 等 wrapper、且元件式組合性較弱。Recharts 是「React 為一等公民」的 SVG 圖表庫，元件可組合、props 即資料模型、對 React Testing Library 與 snapshot 都更友善，貼合本專案以 React 為主的測試策略。

### 為何不選 Express / Fastify

Express 對 reviewer 熟悉度最高，但它把 middleware 慣例與 router 抽象一次塞進來，對只有四條 route（`/healthz` + 三條 metric）的 demo 太重；Fastify 的型別與 schema 驗證優勢在後端不上 TS 的本專案也用不到。`node:http` 0 runtime 相依、Supertest 直接吃 `http.Server`、與本專案「自己用 Node.js 採集、自己畫圖」的展示重點一致。若未來路由規模真的擴大（或需要 auth / rate limiting）再評估升級。

### 為何不選 Jest

Jest 是 React 生態的歷史預設，但與原生 ES modules / Vite 整合需要額外的 transform 與 mock 設定，維護成本逐年上升。Vitest 與 Vite 共用設定、API 與 Jest 相容、watch / coverage / UI 體驗一致，且能在前後端共用同一 runner，省下一整套 reporter 與 config。對作品集而言，「前後端共用 Vitest」也是一個能被 reviewer 一眼看出來的整潔決策。
