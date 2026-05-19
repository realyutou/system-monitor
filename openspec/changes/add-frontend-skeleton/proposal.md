## Why

`docs/roadmap.md` 階段 #4 要求第一次落地前端骨架：用 Vite + React 18 + TypeScript 開出一個最小頁面，掛載時 `fetch('/healthz')` 並顯示「Backend: ok」。在此之前 repo 只有 `server.js` + `server/metricsRouter.js` + `tests/server/`，沒有任何前端工具鏈；此 change 同時負責 (a) 引入整套前端 toolchain（Vite + React + TS strict + jsdom + RTL）、(b) 完成 `/healthz` 整合、(c) Refactor 把 fetch 抽進 `useHealth()` hook 與 `src/lib/api.ts`，為 phase #5 的 `<CpuChart>`、phase #6 的 polling 預先擺好整合點。同時依 `CLAUDE.md` 紀律，本 change 也修正兩處 constitution 文字（roadmap phase #4 驗證指令、CLAUDE.md §Running the project），讓 `npm start` 從原本的後端 alias 正式轉為前端啟動指令。

## What Changes

- 新增前端 toolchain（devDeps）：`vite`、`@vitejs/plugin-react`、`react`、`react-dom`、`@types/react`、`@types/react-dom`、`typescript`、`jsdom`、`@testing-library/react`、`@testing-library/jest-dom`、`@testing-library/user-event`。
- 新增 Vite / TS / Vitest 設定檔：`index.html`、`vite.config.ts`（含 `server.proxy` 把 `/healthz` 與 `/api` 代理到 `http://localhost:3001`）、`tsconfig.json`（`strict: true`，`include: ['src']`）、`tsconfig.node.json`（給 `vite.config.ts` 用）、`src/setupTests.ts`（載入 `@testing-library/jest-dom/vitest`）。
- 新增 vitest 設定：在 `vite.config.ts` 內以 `test.environmentMatchGlobs: [['src/**', 'jsdom']]` 讓 `src/**/*.test.{ts,tsx}` 跑 jsdom；既有 `tests/server/**/*.test.js` 維持 node 環境、不需修改。
- 新增 `src/App.test.tsx`：mock `fetch('/healthz')` 回 `{ status: 'ok' }`，render `<App />`，斷言畫面出現 `Backend: ok` 文字；TDD red 階段先 fail。
- 新增 `src/main.tsx`、`src/App.tsx`（Green 階段先 inline fetch；Refactor 階段改用 `useHealth()`）。
- 新增 `src/lib/api.ts`：export `HEALTHZ_ENDPOINT = '/healthz'` 與 zero-arg `getHealth(): Promise<{ status: string }>`，與後端 `readCpu()` / `readMemory()` / `readDisk()` 的零參數風格對稱。
- 新增 `src/hooks/useHealth.ts`：包裝 `getHealth()` + `useState` + `useEffect`，回傳 `{ status: 'loading' | 'ok' | 'error' }`，是 phase #6 polling hook 的模式雛形。
- 新增 `src/App.module.css`（或 `/frontend-design` skill 產出的同等 CSS 檔）：Green 階段透過 `/frontend-design` skill 取得最小視覺基底（typography + layout），避免 AI 預設醜陋風並為 phase #5+ 圖表頁面建立風格基線。
- 修改 `package.json`：
  - `scripts.start` 從 `node server.js` 改為 `vite`（前端 dev server）。
  - 新增 `scripts.build = 'vite build'`、`scripts.preview = 'vite preview'`。
  - 新增上述 11 個前端 devDeps。
  - 保留 `scripts.test = 'vitest run'` 與 `scripts.test:watch = 'vitest'` 不動；後端不另包 npm script，reviewer 直接 `node server.js`。
- 修改 `.gitignore`：新增 `dist/`、`*.tsbuildinfo`。
- 修改 `docs/roadmap.md`：phase #4 驗證指令的 `npm run dev` 改為 `npm start`，與本 change 鎖定的 script 語意一致。
- 修改 `CLAUDE.md` §Running the project：把 `npm start # node server.js — listens on :3001` 改述為「`npm start # vite — Vite dev server on :5173 with proxy to :3001`」並新增「後端用 `node server.js` 直接啟動，不包成 npm script」一行。
- **鎖定的決策**：
  - Repo layout：單一根 `package.json`，前端原始碼在 `src/`，`index.html` 在根目錄（Vite 預設），不引入 npm workspaces。
  - CORS 策略：Vite dev proxy；`server.js` 不加任何 CORS header。
  - Dev 指令：`npm start` = 前端 vite；後端 = `node server.js`（無 npm script 包裝）；reviewer 兩 terminal。
  - 測試位置：co-located（`src/App.test.tsx` 與元件同目錄），後端維持 `tests/server/`。
  - Vitest 環境切換：`environmentMatchGlobs` 而非 per-file `// @vitest-environment` 註解；jsdom 限定 `src/**`，後端測試不受影響。
  - App 顯示契約：唯一斷言是「fetch 成功後 `Backend: ok` 文字出現」；loading / error 狀態存在但不在 phase #4 斷言（避免 over-engineering）。
  - useHealth() 介面：`{ status: 'loading' | 'ok' | 'error' }`，hook 內呼叫 `getHealth()` from `src/lib/api.ts`。
  - fetch mock：`vi.stubGlobal('fetch', vi.fn().mockResolvedValue(...))`，不引入 `msw`。
  - 視覺基底：透過 `/frontend-design` skill 產出 phase #4 最小頁面樣式，作為 phase #5+ 的風格基線。
- **非變更**：
  - 不引入 Recharts / `<CpuChart>`（phase #5）。
  - 不引入 polling 機制 / `useMetricPolling` hook（phase #6）。
  - 不處理 RWD / media queries（phase #7）。
  - 不引入 fixture 注入（phase #8）。
  - 不引入 `concurrently` / `npm-run-all`（兩個 process 由 reviewer 各自開 terminal）。
  - 不引入 Tailwind / styled-components（`docs/tech-stack.md` 已釘 CSS Modules 或一般 CSS）。
  - 不引入 `msw`、Service Worker、API mock library。
  - 不修改 `server.js`、`server/metricsRouter.js`、`tests/server/*.test.js`。
  - 不引入後端 CORS middleware。
  - 不修改 `docs/mission.md`、`docs/tech-stack.md`、`BACKGROUND.md`（內容已支援本 change）。

## Capabilities

### New Capabilities
- `frontend-app`: 建立 React + TypeScript 前端應用的對外契約：根元件 `<App />` 在掛載時呼叫 `/healthz`、回 200 時顯示 `Backend: ok`；Vite dev server 對 `/healthz` 與 `/api/*` 設 proxy；fetch / state 抽到 `useHealth()` hook 與 `src/lib/api.ts`；測試以 jsdom + RTL 跑、與後端 node 環境測試共存於同一 Vitest config。

### Modified Capabilities
<!-- 無：本 change 不修改 backend-server 或 project-constitution capability 的 spec-level 行為。CLAUDE.md 與 docs/roadmap.md 的文字修正屬於 documentation，不對應 spec requirement 變動。 -->

## Impact

- **新增檔案**：
  - 前端原始碼：`index.html`、`src/main.tsx`、`src/App.tsx`、`src/App.test.tsx`、`src/setupTests.ts`、`src/lib/api.ts`、`src/hooks/useHealth.ts`、`src/App.module.css`（或 `/frontend-design` skill 決定的同等檔名）。
  - 設定：`vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`。
  - openspec：`openspec/changes/add-frontend-skeleton/{proposal.md, design.md, tasks.md, specs/frontend-app/spec.md}`。
- **既有檔案修改**：
  - `package.json`：scripts (`start` → `vite`、新增 `build`、`preview`) + devDeps 11 個。
  - `.gitignore`：加 `dist/`、`*.tsbuildinfo`。
  - `docs/roadmap.md`：phase #4 驗證指令 `npm run dev` → `npm start`。
  - `CLAUDE.md` §Running the project：`npm start` 重新對應到前端 vite，補上「後端直接 `node server.js`」說明。
- **npm 相依**：新增 11 個 devDeps（見 §What Changes）；無新 runtime dep（`systeminformation` 維持後端使用）。
- **目錄結構**：repo 第一次出現 `src/` 子目錄；後續 phase #5+ 的元件、phase #6 的 hook、phase #8 的 fixtures 都會擴充本目錄。
- **流程影響**：
  - Reviewer 驗證 phase #4 需開兩個 terminal：A 跑 `node server.js`、B 跑 `npm start`，瀏覽器開 Vite dev URL 看到 `Backend: ok`。
  - `npm test` 不變，但內部會同時跑 jsdom（前端）與 node（後端）兩種環境的測試；vitest config 由 `environmentMatchGlobs` 自動切換。
- **解鎖**：
  - phase #5 `<CpuChart>` 可直接掛在 `<App />` 內、復用 `src/lib/api.ts` 的 endpoint 常數模式。
  - phase #6 `useMetricPolling` hook 可直接 mirror `useHealth()` 的形狀。
  - phase #7 RWD 與 phase #8 fixture 都建立在本 change 提供的 `src/` 結構之上。
