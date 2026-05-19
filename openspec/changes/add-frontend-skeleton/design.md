## Context

本 change 是 `docs/roadmap.md` 階段 #4 的落地。在此之前：

- Phase #1 (`2026-05-19-add-healthz`) 已交付 `server.js` + `createServer()` + `GET /healthz` → `{ status: 'ok' }`。
- Phase #2 (`2026-05-19-add-cpu-metric`) 已交付 `/api/metrics/cpu`、`readCpu()` 模式。
- Phase #3 (`2026-05-19-add-memory-disk-metrics`) 已交付 `/api/metrics/memory` / `/api/metrics/disk` 以及 `server/metricsRouter.js`，後端三條 metric route 全部就位。
- repo 完全沒有前端：沒有 `vite.config.*`、`tsconfig.*`、`src/`、`index.html`、React / Vite / TS / RTL 任一 dep。

`docs/roadmap.md` 階段 #4 contract：

- 🔴 Red：RTL render `<App />`，mock `fetch('/healthz')` 回 200，斷言畫面出現 `Backend: ok`。
- 🟢 Green：Vite + React + TS 骨架；`useEffect` 內 `fetch('/healthz')`；測試轉綠。
- ♻️ Refactor：抽 `useHealth()` hook；fetch URL 收進 `src/lib/api.ts`。
- 驗證：`npm test -- app` 全綠 + `npm run dev` 後瀏覽器看到 `Backend: ok`。

`docs/tech-stack.md` 已釘定：

- Frontend = React 18 + TypeScript（`strict: true`） + Vite + Recharts（phase #5 才用）+ CSS Modules / 一般 CSS。
- Test runner 一律 Vitest；元件測試用 React Testing Library；matchers 用 `@testing-library/jest-dom`；互動模擬用 `@testing-library/user-event`。
- 預設策略 polling 2s；本 change 只做單次 fetch，polling 屬 phase #6。

約束：

- **TDD 強制**（`docs/mission.md` §品質原則）：先 fail 的 `App.test.tsx` 再進實作。
- **效能預算**（`docs/tech-stack.md` §效能預算）：首屏 LCP < 2 s，單一 metric API < 100 ms。本 change 只 fetch `/healthz` 一次，遠低於預算；但要確認新加的 Vite dep 不會把 dev server 首頁變慢（dev 模式下 < 1 s 視為可接受）。
- **最小實作**（`docs/mission.md`）：唯一可見契約是「Backend: ok 出現」；不引入 phase #5+ 的圖表 / polling / RWD / fixture。
- **後端不動**：`server.js` / `server/metricsRouter.js` / `tests/server/*` 整段不受本 change 影響；跨來源問題由 Vite dev proxy 解，不在後端加 CORS。
- **既有後端測試不受波及**：`tests/server/*.test.js` 在新的 vitest config 下必須維持 node 環境、繼續綠燈。
- **constitution 文字一致性**（`CLAUDE.md`「If a request conflicts with the constitution, amend the constitution first via a new openspec change, then implement.」）：本 change 同時修 `docs/roadmap.md` 與 `CLAUDE.md` 兩處文字，使其與「`npm start` = 前端」決策一致。

## Goals / Non-Goals

**Goals:**

- `<App />` 在掛載時呼叫 `fetch('/healthz')`，HTTP 200 + `{ status: 'ok' }` 後畫面出現可見文字 `Backend: ok`。
- Vite dev server 對 `/healthz` 與 `/api/*` 設 proxy 到 `http://localhost:3001`；瀏覽器看到的所有 fetch 都是同源。
- `useHealth()` hook 包裝 fetch + state，回傳 `{ status: 'loading' | 'ok' | 'error' }`；`<App />` 不直接呼叫 `fetch`。
- `getHealth()` 與 endpoint 常數 `HEALTHZ_ENDPOINT` 集中在 `src/lib/api.ts`。
- 前端原始碼一律 `.ts` / `.tsx`，`tsconfig.json` 開 `strict: true`、`include: ['src']`、`jsx: 'react-jsx'`。
- `npm test` 同時跑前後端測試，前端走 jsdom、後端走 node，全部綠燈。
- `npm start` 啟動 Vite dev server；後端 reviewer 自己 `node server.js`。
- `docs/roadmap.md` phase #4 驗證指令與 `CLAUDE.md` §Running the project 內容與實際 scripts 一致。
- 透過 `/frontend-design` skill 產出 phase #4 最小頁面的視覺基底（typography / layout / color），作為 phase #5+ 的設計基線。

**Non-Goals:**

- 不實作 Recharts 圖表（phase #5）。
- 不實作 polling（phase #6）。
- 不處理 RWD / media queries / mobile layout（phase #7）。
- 不引入 fixture 注入機制（phase #8）。
- 不實作 error UI、retry button、loading skeleton（phase #4 唯一斷言是 happy path）。
- 不引入後端 CORS middleware；本 change 完全不動 `server.js`。
- 不引入 `concurrently`、`npm-run-all`、`tsx`、`ts-node`、`msw`、Tailwind、styled-components。
- 不把後端搬成 TypeScript（`server.js` 維持 `.js`，與 `docs/tech-stack.md` 一致）。
- 不引入 npm workspaces；單一根 `package.json`。
- 不寫前端的 production build 部署文件（demo 不上 production）；`npm run build` 僅為 reviewer 驗證 Vite 鏈正常。

## Decisions

### 1. Vite dev proxy，而非後端 CORS middleware

**選擇**：`vite.config.ts` 內

```ts
server: {
  proxy: {
    '/healthz': 'http://localhost:3001',
    '/api': 'http://localhost:3001',
  },
},
```

`server.js` 完全不動。

**為何**：

- 後端維持 0 middleware 的形狀，與 `docs/tech-stack.md` §取捨記錄〈為何不選 Express / Fastify〉的「最小面積」精神一致。
- 前端 fetch 用相對路徑（`fetch('/healthz')`），瀏覽器 dev tools 看到的是同源，與 production 部署（前端與後端同網域）行為一致；除錯路徑乾淨。
- Proxy 設定本身極小：4 行 config，沒有額外 dep。

**替代方案考慮**：

- 後端加 CORS header：捨棄。會把 production-only 的 middleware 邏輯滲入 demo 後端，違反「最小實作」；且 Vite dev 與 production 行為兩套，反而更難 reason。
- 前端 fetch 寫死 `http://localhost:3001/healthz`：捨棄。瀏覽器會走 CORS preflight，又繞回需要後端 CORS；且 production 部署時還得改前端 URL。
- 同時做 proxy + CORS：捨棄。重複實作。

### 2. 單一根 `package.json`，前端原始碼在 `src/`

**選擇**：根目錄 `package.json` 同時管前後端 deps；前端原始碼在 `src/`、`index.html` 在根（Vite 預設）。不引入 npm workspaces。

**為何**：

- Reviewer 一次 `npm install` 拿到所有 dep，與 phase #1–#3 既有體驗一致（reviewer 已習慣根目錄是真相）。
- Workspaces 對 demo 規模 overkill：多一層 `frontend/`、多一份 `package.json`、reviewer 要學 workspace 指令。
- `server.js` 在根、`src/` 在根，兩者不互相 import，互不干擾。
- 後續 phase #5+ 的前端檔案全部進 `src/`，後端則維持 `server.js` + `server/`，目錄分界清楚。

**替代方案考慮**：

- 分 `frontend/` 子目錄，前端自有 `package.json`：捨棄。雙 install、雙 lockfile，且 vitest 跨 monorepo 設定更複雜。
- npm workspaces：捨棄。同上 overkill。
- 前端進 `client/` 或 `web/`：與 `src/` 等價；採 Vite/Vitest/React 社群預設 `src/`。

### 3. `npm start` 改為啟動 Vite（前端），後端維持 `node server.js` 無 npm script

**選擇**：

```json
"scripts": {
  "start": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

後端不另包 npm script；reviewer 直接 `node server.js`。

**為何**：

- `CLAUDE.md` 既有註記「`npm start` (frontend, not yet wired — currently aliased to the backend)」已預告本切換是設計意圖；本 change 把暫時 alias 正式換成最終語意。
- 兩個 process 性質不同（後端是長駐 Node、前端是 dev tool），混在同一個 script 反而誤導 reviewer 以為它們有共生命週期。
- 不引入 `concurrently`：兩個 process 各自 terminal、各自 logs、各自 Ctrl+C，最簡單也最易 debug。
- 後端不包 script 的理由：`node server.js` 已經是 Node 約定 entry point，多一層 `npm start` 別名只是給人 alias，沒有實質好處。

**替代方案考慮**：

- 保留 `npm start = node server.js`，前端用 `npm run dev`：捨棄。與 CLAUDE.md 既有意圖（`npm start` 是前端）相反，反而違反 constitution。
- `npm start` 用 `concurrently` 同時跑前後端：捨棄。Logs 交織、Ctrl+C 行為不一致、reviewer 看不出哪邊出問題。
- 三個 script（`dev` / `dev:back` / `dev:all`）：捨棄。增加心智負擔，phase #4 不需要這個彈性。

由於 `docs/roadmap.md` phase #4 驗證指令原寫 `npm run dev`，本 change 同步把該行文字改為 `npm start`，避免文件與實作脫節。

### 4. co-located 測試：`src/App.test.tsx` 與元件同目錄

**選擇**：前端測試檔放在 `src/` 內，與被測元件相鄰（e.g. `src/App.tsx` ↔ `src/App.test.tsx`）。後端維持 `tests/server/`。

**為何**：

- React 生態最常見模式：閱讀 `App.tsx` 時測試一眼可見，重構時 IDE 跳轉直接。
- 後端既有 `tests/server/healthz.test.js` 等已落地，無理由也無收益反向遷移。
- 兩種風格共存不會混亂：以「測試是否需要 jsdom」當分界線，恰好對應「前端 co-located vs 後端集中」的目錄差異。

**替代方案考慮**：

- 全部集中到 `tests/`：捨棄。與 React 生態慣例衝突，且 vitest config 還是要靠 path glob 切環境，集中沒省事。
- 全部 co-located（含後端）：捨棄。後端測試已穩定，不為了一致性破壞既有 commit history。

### 5. Vitest 環境切換用 `environmentMatchGlobs`，而非 per-file 註解

**選擇**：`vite.config.ts` 內

```ts
test: {
  environment: 'node',           // 預設 = 後端
  environmentMatchGlobs: [
    ['src/**', 'jsdom'],         // 前端 src/ 走 jsdom
  ],
  setupFiles: ['src/setupTests.ts'],
  globals: false,                // 仍維持顯式 import { describe, it, expect } 風格
  include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{js,ts}'],
},
```

**為何**：

- 既有後端測試完全不需要編輯（不必加 `// @vitest-environment` 註解）；任何後端測試的編輯都增加 regression 風險。
- 單一真相來源：環境分界以「檔案路徑」表達，與「co-located vs 集中」的目錄決策一致，讀 config 一眼看懂。
- `setupFiles` 在 jsdom 環境下載入 `@testing-library/jest-dom/vitest`，提供 `toBeInTheDocument` 等 matcher；後端跑 node 環境時 setupFiles 仍會被 import 但不依賴 DOM 的 matcher 不會壞。為避免後端跑時也載入前端 setup，必要時把 setupFiles 改為 `environmentMatchGlobs` 之外的條件分支；目前單一 setupFiles 足夠且最簡單。
- vitest v1 仍支援 `environmentMatchGlobs`（雖然 v2 推 `projects`，但 vitest v1 是本 repo 釘定版本）。

**替代方案考慮**：

- per-file `// @vitest-environment jsdom`：捨棄。每個前端測試檔頂部都要寫，遺漏難察覺。
- vitest workspaces / projects：捨棄。v1 階段非主流路徑；config 更複雜，phase #4 用不到。
- 把預設環境改成 jsdom、後端 opt-in node：捨棄。需要編輯既有後端測試。

### 6. App 元件顯示契約最小化：唯一可見斷言是 `Backend: ok`

**選擇**：

```tsx
function App() {
  const { status } = useHealth();
  return <main><p>Backend: {status === 'ok' ? 'ok' : '…'}</p></main>;
}
```

測試只斷言「fetch 成功後 `Backend: ok` 文字出現」；loading（`Backend: …`）與 error（仍 `Backend: …` 或自訂）不在 phase #4 斷言。

**為何**：

- `docs/mission.md` §品質原則「最小、最直接的實作，讓該測試（且僅該測試）通過」。phase #4 唯一被 roadmap 與 spec 規範的可見行為就是 happy path。
- Loading / error 狀態實作本身存在（hook 內部 state 機器），但 UI 表現不被斷言，使 phase #5+ 可以自由演化（例如改成 spinner、Toast、retry）而不必動 phase #4 的測試。
- `/frontend-design` skill 可以自由發揮 layout / typography / 顏色，只要文字節點包含 `Backend: ok` 即可通過測試。

**替代方案考慮**：

- 同時斷言 loading / error：捨棄。over-spec，把 UI 細節釘死，phase #5+ 改設計時要動測試。
- 把 `useHealth()` 暴露成 throw on error：捨棄。會讓 `<App />` 需要 Error Boundary，phase #4 不引入這個複雜度。

### 7. `useHealth()` 介面：`{ status: 'loading' | 'ok' | 'error' }`

**選擇**：

```ts
// src/hooks/useHealth.ts
export function useHealth() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((res) => { if (!cancelled) setStatus(res.status === 'ok' ? 'ok' : 'error'); })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, []);
  return { status };
}
```

**為何**：

- 與後端 `readCpu()` / `readMemory()` / `readDisk()` 的零參數風格對稱（hook 也是 zero-arg）。
- 三態（`loading` / `ok` / `error`）覆蓋所有可能：未完成、成功、失敗；不需要 `data`、`error`、`isPending` 多欄位。
- `cancelled` flag 防止 unmount 後 setState 警告，是 React 18 strict mode 下的標準做法。
- 為 phase #6 `useMetricPolling(endpoint, intervalMs)` 留好形狀：phase #6 hook 將 mirror 同樣的「fetch + state + cleanup」骨架，只是把 once 換成 interval。

**替代方案考慮**：

- 暴露 `{ status, data, error }`：捨棄。phase #4 沒用到 data / error 欄位；YAGNI。
- 用 React Query / SWR：捨棄。`docs/tech-stack.md` 沒釘這些 dep；引入它們屬於另起架構決策，要先改 tech-stack 再做。
- 直接在 `App.tsx` inline `useEffect`：捨棄。Refactor 階段一定要抽出去（roadmap 寫明），不如 Green 階段就以 inline、Refactor 階段抽 hook 的順序進行。

### 8. fetch endpoint 集中在 `src/lib/api.ts`

**選擇**：

```ts
// src/lib/api.ts
export const HEALTHZ_ENDPOINT = '/healthz';
export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(HEALTHZ_ENDPOINT);
  if (!res.ok) throw new Error(`healthz ${res.status}`);
  return res.json();
}
```

**為何**：

- Roadmap Refactor 步驟字面要求「把 fetch URL 收進 `src/lib/api.ts`」。
- 與後端 `server/metricsRouter.js` 的角色對稱：所有外部介面在一個檔案，元件 / hook 只 import 高階 helper。
- Phase #5+ 加 `/api/metrics/cpu` 等 endpoint 時，只要在同檔加常數與 helper，沒有「URL 散落」問題。

**替代方案考慮**：

- 把 fetch 留在 hook 內：捨棄。違反 roadmap 字面要求；且 phase #5+ 不同 hook 會散落多份 fetch。
- 用 `BASE_URL = ''` + 拼接：捨棄。增加抽象層、phase #4 唯一 endpoint 還在相對路徑，沒有 base URL 問題。

### 9. fetch mock 策略：`vi.stubGlobal('fetch', ...)`，不引入 `msw`

**選擇**：`App.test.tsx` 內

```ts
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ status: 'ok' }),
  }));
});
```

**為何**：

- `msw` 適合需要「真實 network 行為 + service worker」的整合測試；本 change 只測「App 收到 200 後渲染什麼」，stub fetch 已足夠。
- Vitest 內建 `vi.stubGlobal` 與 `vi.fn()`，0 dep。
- 後續 phase #5+ 的測試也用同模式，mock 策略一致。

**替代方案考慮**：

- `msw`：捨棄。引入 service worker 與 handler 慣例，對 demo 規模 overkill。
- Mock `useHealth` 而非 fetch：捨棄。測試會繞過 hook，反而沒驗到「hook 真的會在 mount 觸發 fetch」這個行為。
- 改用 `global.fetch =` 直接賦值：捨棄。`vi.stubGlobal` 會自動在 `afterEach` 還原（搭配 `vi.unstubAllGlobals()` 或 vitest 內建還原），更乾淨。

### 10. 視覺基底交給 `/frontend-design` skill 產生

**選擇**：Green 階段在寫 `src/App.tsx` 之前，先調用 `/frontend-design` skill 取得 phase #4 最小頁面的 JSX + CSS（或 CSS Module）骨架，內容至少含：header / status block / typography / 配色變數。完成後手動把 `useHealth()` 接到該骨架的文字節點上。

**為何**：

- `/frontend-design` skill 的目的是避開「AI 預設醜陋風」（generic AI aesthetics），即使 phase #4 只顯示一行字，這個基底也會被 phase #5+（圖表、polling indicator、RWD）繼承。第一次落地的 layout 與設計變數會主導之後所有頁面。
- 測試只斷言文字 `Backend: ok` 是否出現，與 JSX 結構 / class 名稱 / CSS 變數無關；`/frontend-design` 可以自由發揮版面而不破壞測試。
- 把視覺決策外包給專業 skill，與「自己寫 Node.js 採集、自己畫圖」的展示重點不衝突——展示重點在工程紀律與資料流，不在「我會手刻 CSS」。

**替代方案考慮**：

- 全 inline 寫死簡單 CSS：捨棄。會把 AI 預設樣式滲進專案，phase #5+ 補不回來。
- 引入 Tailwind / Chakra：捨棄。被 `docs/tech-stack.md` 顯式排除。
- 用 CSS-in-JS（styled-components）：同上被排除。

**測試與設計的分界**：`App.test.tsx` 的斷言策略是「文字內容」（`screen.getByText(/Backend: ok/i)` 或 `screen.getByText('Backend: ok')`），不斷言 class 名稱 / 結構，確保 `/frontend-design` 產出的任何合理 JSX 都能通過測試。

### 11. TypeScript 只覆蓋前端，後端維持 `.js`

**選擇**：`tsconfig.json` 的 `include` 限定 `['src']`、`tsconfig.node.json` 限定 `['vite.config.ts']`。`server.js` 與 `server/*.js` 維持 JavaScript。

**為何**：

- `docs/tech-stack.md` §Backend 沒釘 TypeScript；後端用 JS 是顯式選擇（reviewer 一致預期）。
- 後端 contract 已由 spec 用文字 + scenario 表達，型別補強對 demo 收益小。
- 把後端搬 TS 屬於另一個架構決策，需要先改 tech-stack。

**替代方案考慮**：把後端也搬 TS：捨棄。超出 phase #4 scope。

## Risks / Trade-offs

- **[Risk]** Vite dev proxy 與 production 行為不一致（production 通常前端 build 後與後端同源） → **Mitigation**：本 demo 無 production 部署需求；若未來上 production，會在另一個 change 中設計 reverse proxy 或同源部署。本 change 在 README / docs 不承諾 production；驗證指令只談 dev 模式。
- **[Risk]** `environmentMatchGlobs` 在 vitest v2 被列為 deprecated → **Mitigation**：本 repo 釘定 vitest ^1（`package.json` 既有版本），未升級前不會踩 deprecation；若未來升 v2，遷移到 `projects` 是 1 個 commit 的事。
- **[Risk]** RTL setupFiles 在後端 node 測試跑時也被 import，可能因 `@testing-library/jest-dom/vitest` 嘗試擴充 `expect` 而失敗 → **Mitigation**：`@testing-library/jest-dom/vitest` 的 setup 對非 DOM 環境是 no-op-ish（只擴充 matcher、不會主動操作 DOM）；若實測中出現問題，把 `setupFiles` 改為條件式（用 `environmentMatchGlobs` 之外另設 `test.deps.inline` 或拆兩個 setup 檔）。Red 階段跑 `npm test` 時若 backend 測試突然紅，立刻回退這個決定。
- **[Risk]** 後端被 reviewer 忘了啟動，前端 fetch 會在 proxy 端 ECONNREFUSED → **Mitigation**：`useHealth()` 內 try/catch 仍 setStatus('error')，UI 不會 crash；`CLAUDE.md` §Running the project 文字明確要求兩 terminal；驗證指令也明列兩個 process。
- **[Risk]** `/frontend-design` skill 產出含 phase #5+ 的圖表 placeholder 或多餘元素，違反 phase #4 最小實作 → **Mitigation**：調用 skill 時明確 brief「只做 phase #4：一個 header + 一個 status 區塊，文字節點要能輕易插入 `Backend: <status>`，不要 chart placeholder、不要 polling indicator、不要 mobile breakpoint」。產出後人工裁剪不需要的部分。
- **[Risk]** Vite 在某些 Node.js 版本（如 < 20.5）對 ESM resolution 有 bug → **Mitigation**：`package.json` 既有 `engines.node = '>=20'`；Node 20.5+ 是 reviewer 環境的合理假設。
- **[Trade-off]** 不引入 React Query / SWR → 未來 phase #6 polling 必須自己手寫 cleanup / cancellation。可接受，hook 自寫是 phase #6 的核心展示點之一（與後端「自己用 Node.js 採集」呼應）。
- **[Trade-off]** 後端維持 `.js` → 前後端 type 不能透過 `import type` 共用（如 metric DTO）。可接受，phase #5+ 可在 `src/lib/api.ts` 內手寫 TS interface 對應 backend 回傳，contract 不對齊時測試會 fail。
- **[Trade-off]** 單一根 `package.json` → 前後端 dep 混在一起，`npm ls` 結果較雜。可接受，demo 規模這個雜度可忽略。
- **[Trade-off]** `npm start` 從後端切到前端 → 任何既有 reviewer 預期「`npm start` 啟後端」的習慣會被打破。可接受，CLAUDE.md 既有註記已預告本切換，且 `docs/roadmap.md` 與 `CLAUDE.md` 兩處同步更新。
- **[Trade-off]** 視覺基底外包給 `/frontend-design` → 產出細節由 skill 決定，可能與本人手作美感有微差。可接受，這個微差換來「避開 generic AI 美感」的明顯收益；phase #5+ 都會在這個基底上延伸。

## Migration Plan

不適用（純新增）。撤回方式：

1. 移除新增的 src/ 內所有檔案、`index.html`、`vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`。
2. `package.json` 還原：`scripts.start` 改回 `node server.js`、移除 `build` / `preview`、移除 11 個前端 devDeps。
3. `.gitignore` 移除 `dist/` 與 `*.tsbuildinfo`。
4. 還原 `docs/roadmap.md` phase #4 驗證指令的 `npm start` 為 `npm run dev`。
5. 還原 `CLAUDE.md` §Running the project 的 `npm start` 對應到 `node server.js`。
6. 跑 `npm test` 確認 phase #1–#3 的後端測試仍綠（healthz / cpu / memory / disk）。

## Open Questions

- **`/frontend-design` skill 是否該被釘進 `docs/tech-stack.md` 作為前端設計來源？** 本 change 把 skill 當作 phase #4 的工具使用，不強制 phase #5+ 沿用；若 phase #5 圖表也想用 skill 產生視覺基底，再決定是否把 skill 寫進 tech-stack。
- **`useHealth()` 是否要回傳最近一次更新的 timestamp？** 對 phase #4 不需要；phase #6 polling 時可能需要顯示「上次更新時間」。本階段先不加，phase #6 設計時再評估。
- **前端是否要 `index.html` 內預設一個 `<noscript>` 訊息？** 對 demo 不必要；瀏覽器都跑 JS。本階段不加。
- **是否要在 `package.json` 加 `engines.npm` 釘 npm 版本？** 既有 `engines.node` 只釘 Node；npm 版本目前無已知相容性問題。本階段不加，未來真踩到再加。
