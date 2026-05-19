## 1. 🔴 Red：寫 fail 的 App.test.tsx + 補齊 toolchain 讓測試能跑

- [x] 1.1 在 `package.json` 新增前端 devDeps：`vite ^5`、`@vitejs/plugin-react ^4`、`react ^18`、`react-dom ^18`、`@types/react ^18`、`@types/react-dom ^18`、`typescript ^5`、`jsdom ^24`、`@testing-library/react ^14`、`@testing-library/jest-dom ^6`、`@testing-library/user-event ^14`，跑 `npm install`
- [x] 1.2 新增 `vite.config.ts`：`import { defineConfig } from 'vite'`、`import react from '@vitejs/plugin-react'`、export default `defineConfig({ plugins: [react()], server: { proxy: { '/healthz': 'http://localhost:3001', '/api': 'http://localhost:3001' } }, test: { environment: 'node', environmentMatchGlobs: [['src/**', 'jsdom']], setupFiles: ['src/setupTests.ts'], include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{js,ts}'] } })`
- [x] 1.3 新增 `tsconfig.json`：`compilerOptions: { target: 'ES2022', useDefineForClassFields: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], module: 'ESNext', skipLibCheck: true, moduleResolution: 'bundler', allowImportingTsExtensions: true, resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', strict: true, noUnusedLocals: true, noUnusedParameters: true, noFallthroughCasesInSwitch: true, types: ['vitest/globals', '@testing-library/jest-dom'] }`、`include: ['src']`、`references: [{ path: './tsconfig.node.json' }]`
- [x] 1.4 新增 `tsconfig.node.json`：`compilerOptions: { composite: true, skipLibCheck: true, module: 'ESNext', moduleResolution: 'bundler', allowSyntheticDefaultImports: true, strict: true }`、`include: ['vite.config.ts']`
- [x] 1.5 新增 `src/setupTests.ts`：`import '@testing-library/jest-dom/vitest';`
- [x] 1.6 新增 `src/App.test.tsx`：`import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'`、`import { cleanup, render, screen, waitFor } from '@testing-library/react'`、`import App from './App'`；`afterEach(() => { cleanup(); vi.unstubAllGlobals(); })`；三個 `it`：
    - `it('renders Backend: ok after a successful /healthz fetch')`：`vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }))`；`render(<App />)`；`await waitFor(() => expect(screen.getByText(/Backend: ok/i)).toBeInTheDocument())`；`expect(global.fetch).toHaveBeenCalledWith('/healthz')`
    - `it('does not crash when /healthz fetch rejects')`：`vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))`；`render(<App />)`；`await waitFor(() => expect(screen.queryByText(/Backend: ok/i)).not.toBeInTheDocument())`；`expect(document.querySelector('main')).not.toBeNull()`
    - `it('starts in a non-ok state before the fetch resolves')`：`vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))`；`render(<App />)`；`expect(screen.queryByText(/Backend: ok/i)).toBeNull()`
- [x] 1.7 跑 `npm test -- app`，親眼確認測試 fail（`src/App.tsx` 不存在 → Vite resolve 失敗）
- [x] 1.8 跑 `npm test`，確認後端 `tests/server/*.test.js` 四支（healthz / cpu / memory / disk）仍綠（vitest config 改動不破壞既有測試）
- [x] 1.9 commit，訊息標註 `stage 4 (red): failing App test + vite/vitest toolchain`

## 2. 🟢 Green：用 `/frontend-design` 產出視覺基底 + 接上 useEffect/fetch

- [x] 2.1 新增 `index.html`：標準 Vite + React 模板，`<title>system-monitor</title>`、`<div id="root"></div>`、`<script type="module" src="/src/main.tsx"></script>`
- [x] 2.2 新增 `src/main.tsx`：`import { StrictMode } from 'react'`、`import { createRoot } from 'react-dom/client'`、`import App from './App'`、`import './App.module.css'`（若 `/frontend-design` 輸出檔名不同則對應調整）；`createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)`
- [x] 2.3 調用 `/frontend-design` skill：brief 內容為「Phase #4 minimum page for a Node.js system-monitor dashboard. The page has ONE visible element: a status block that will display `Backend: <status>`. No charts, no polling indicator, no mobile breakpoints, no placeholder for future content. Provide typography + layout + color tokens that establish a clean design baseline future phases will extend. Output: a React functional component for src/App.tsx and a CSS module (or equivalent) file. The component must include a text node that contains the literal substring `Backend: ok` when its prop or state indicates the backend is healthy.」；把產出整合進 `src/App.tsx`
- [x] 2.4 在 2.3 產出的 `src/App.tsx` 內接上「inline `useEffect` + `useState` + `fetch('/healthz')`」邏輯（Green 階段刻意 inline，Refactor 階段才抽 hook / api 模組）：成功時 setStatus('ok')、失敗時 setStatus('error')、初始 'loading'；模板上把該 status 顯示成 `Backend: ok` / `Backend: …` / `Backend: error` 之一（成功路徑文字必須含 `Backend: ok`）
- [x] 2.5 修改 `package.json`：`scripts.start` 從 `node server.js` 改為 `vite`；新增 `scripts.build = 'vite build'`、`scripts.preview = 'vite preview'`；保留 `scripts.test` 與 `scripts.test:watch` 不動
- [x] 2.6 修改 `.gitignore`：新增 `dist/` 與 `*.tsbuildinfo`
- [x] 2.7 跑 `npm test -- app`，三個 case 全綠
- [x] 2.8 跑 `npm test`，前後端共 7 支測試（4 後端 + 3 前端）全綠
- [x] 2.9 commit，訊息標註 `stage 4 (green): vite/react skeleton fetches /healthz and renders Backend: ok`

## 3. ♻️ Refactor：抽 src/lib/api.ts、src/hooks/useHealth.ts、修 constitution 文字

- [x] 3.1 新增 `src/lib/api.ts`：`export const HEALTHZ_ENDPOINT = '/healthz';`、`export async function getHealth(): Promise<{ status: string }> { const res = await fetch(HEALTHZ_ENDPOINT); if (!res.ok) throw new Error(\`healthz \${res.status}\`); return res.json(); }`
- [x] 3.2 新增 `src/hooks/useHealth.ts`：`import { useEffect, useState } from 'react';`、`import { getHealth } from '../lib/api';`、`export type HealthStatus = 'loading' | 'ok' | 'error';`、`export function useHealth() { const [status, setStatus] = useState<HealthStatus>('loading'); useEffect(() => { let cancelled = false; getHealth().then((res) => { if (!cancelled) setStatus(res.status === 'ok' ? 'ok' : 'error'); }).catch(() => { if (!cancelled) setStatus('error'); }); return () => { cancelled = true; }; }, []); return { status }; }`
- [x] 3.3 修改 `src/App.tsx`：移除 inline `useEffect` / `useState` / `fetch`；改為 `import { useHealth } from './hooks/useHealth';`、`const { status } = useHealth();`；視覺基底（`/frontend-design` 產出）保持不動，只把 status 文字插槽改為消費 hook 的 `status`
- [x] 3.4 跑 `npm test -- app`，三個 case 仍綠（hook 與 api 抽離後行為不變）
- [x] 3.5 跑 `npm test`，前後端共 7 支測試仍全綠
- [x] 3.6 修改 `docs/roadmap.md`：phase #4 行的驗證指令欄位，把 `npm run dev` 取代為 `npm start`（行內保留其餘文字不變）
- [x] 3.7 修改 `CLAUDE.md` §Running the project：把「`npm start                       # node server.js — listens on :3001`」改為「`npm start                       # vite — Vite dev server (default :5173) with proxy to :3001`」；在該 code block 內補一行「`node server.js                  # backend — listens on :3001 (no npm wrapper)`」；下方段落「The two reviewer-facing commands from `BACKGROUND.md` are `node server.js` (backend) and `npm start` (frontend, not yet wired — currently aliased to the backend).」改為「The two reviewer-facing commands from `BACKGROUND.md` are `node server.js` (backend, run directly without an npm wrapper) and `npm start` (frontend Vite dev server).」
- [x] 3.8 commit，訊息標註 `stage 4 (refactor): extract useHealth + src/lib/api and sync constitution docs`

## 4. 驗證（對照 `docs/roadmap.md` 階段 #4 修正後的驗證指令）

- [x] 4.1 跑 `npm test -- app`，退出碼 0、涵蓋三個 case（成功、失敗、初始）
- [x] 4.2 跑 `npm test`，退出碼 0、涵蓋全部 7 支測試（4 後端 + 3 前端），無 jsdom / node 環境衝突
- [x] 4.3 開 terminal A 跑 `node server.js`，確認 `:3001` 啟動成功（log 含 `listening on 3001` 或對應字樣）
- [x] 4.4 開 terminal B 跑 `npm start`，Vite log 顯示 `Local: http://localhost:5173/`（或 Vite 預設 port）
- [x] 4.5 瀏覽器開 Vite dev URL，看到 `Backend: ok` 文字；DevTools Network 確認 `/healthz` 是 200、Response body 為 `{"status":"ok"}`，且 request URL 是相對路徑（不是 `http://localhost:3001`）
- [x] 4.6 暫停 terminal A 的後端（Ctrl+C），重整瀏覽器，畫面不 crash（保持 `<main>` 結構，文字不顯示 `Backend: ok`）；重新跑 `node server.js`，重整後 `Backend: ok` 再次出現
- [x] 4.7 跑 `npm run build`，退出碼 0、產出 `dist/`（驗證 Vite production build chain 至少能 compile）；確認 `dist/` 被 `.gitignore` 忽略

## 5. openspec hygiene

- [x] 5.1 跑 `openspec validate add-frontend-skeleton --strict`，退出碼 0
- [x] 5.2 跑 `openspec status --change add-frontend-skeleton`，proposal / design / specs / tasks 全部 `done`、tasks 全部 `[x]`
- [x] 5.3 暫不執行 `/opsx:archive`；等 reviewer 確認 phase #4 通過、瀏覽器驗證跑過再 archive（避免在驗證前把 delta 併入主 spec）
