## 1. 🔴 Red：寫 fail 的 CpuChart / toCpuSeries / 擴充 App.test.tsx

- [x] 1.1 在 `package.json` 的 `dependencies` 加入 `recharts ^2`，跑 `npm install` 把 dep 拉下來（runtime dep，不放 devDependencies）
- [x] 1.2 新增 `src/lib/toCpuSeries.test.ts`：`import { describe, it, expect } from 'vitest'`、`import { toCpuSeries, type CpuChartRow } from './toCpuSeries'`、`import type { CpuMetricDto } from './api'`；三個 `it`：
    - `it('returns an empty array for empty input')`：`expect(toCpuSeries([])).toEqual([])`
    - `it('maps a single DTO into a single { time, usage } row')`：`const dto: CpuMetricDto = { usagePercent: 42, cores: 8, timestamp: '2026-05-19T10:00:00Z' }`；`const rows = toCpuSeries([dto])`；`expect(rows).toHaveLength(1)`；`expect(rows[0]).toEqual({ time: Date.parse('2026-05-19T10:00:00Z'), usage: 42 })`
    - `it('preserves input order for multiple DTOs')`：建三筆 DTO timestamps `10:00:00Z`、`10:00:02Z`、`10:00:04Z`；斷言 `rows[0].time < rows[1].time && rows[1].time < rows[2].time`
- [x] 1.3 新增 `src/components/CpuChart.fixtures.ts`：`import type { CpuChartRow } from '../lib/toCpuSeries';`；定義 `const baseTime = Date.parse('2026-05-19T10:00:00Z'); const sec = 1000;`；`export const cpu = { idle: [{ time: baseTime + 0 * sec, usage: 6 }, { time: baseTime + 2 * sec, usage: 8 }, { time: baseTime + 4 * sec, usage: 5 }, { time: baseTime + 6 * sec, usage: 12 }, { time: baseTime + 8 * sec, usage: 9 }] satisfies CpuChartRow[] }`
- [x] 1.4 新增 `src/components/CpuChart.test.tsx`：`import { afterEach, describe, expect, it } from 'vitest'`、`import { cleanup, render, screen } from '@testing-library/react'`、`import { CpuChart } from './CpuChart'`、`import { cpu } from './CpuChart.fixtures'`；`afterEach(() => cleanup())`；三個 `it`：
    - `it('renders an SVG path for non-empty data')`：`const { container } = render(<CpuChart data={cpu.idle} width={400} height={200} />)`；`expect(screen.getByTestId('cpu-chart')).toBeInTheDocument()`；`expect(container.querySelector('svg')).not.toBeNull()`；`expect(container.querySelector('path')).not.toBeNull()`
    - `it('mounts even when data is empty')`：`render(<CpuChart data={[]} width={400} height={200} />)`；`expect(screen.getByTestId('cpu-chart')).toBeInTheDocument()`
    - `it('does not import ResponsiveContainer')`（可選靜態 assertion 由 spec scenario 涵蓋；可改為一個讀檔的 lint-style 測試或留給 reviewer 程式碼審查）—— 本 task 採後者，1.4 三個 `it` 只含前兩個
- [x] 1.5 擴充 `src/App.test.tsx`：保留現有三個 `it`（happy / error / loading），把 `vi.stubGlobal('fetch', ...)` 改成 URL 分支 stub，新增 fetch case for `/api/metrics/cpu`：
    - `beforeEach` 內：`vi.stubGlobal('fetch', vi.fn((url: string) => { if (url === '/healthz') return Promise.resolve({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }); if (url === '/api/metrics/cpu') return Promise.resolve({ ok: true, status: 200, json: async () => ({ usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z' }) }); return Promise.reject(new Error(\`unexpected url: \${url}\`)); }))`
    - 既有的 happy test：`await waitFor(() => expect(screen.getByText(/Backend: ok/i)).toBeInTheDocument())`（行為不變）
    - 既有的 error / loading test：分別讓兩條 URL 都 reject / 都 never-resolve（mirror 既有行為）
    - 新增 `it('renders the CpuChart container after a successful /api/metrics/cpu fetch')`：`render(<App />)`；`await waitFor(() => expect(screen.getByTestId('cpu-chart')).toBeInTheDocument())`
    - 新增 `it('renders the CpuChart container even when /api/metrics/cpu rejects')`：stub `/api/metrics/cpu` 為 reject、`/healthz` 為 ok；`render(<App />)`；`await waitFor(() => expect(screen.getByTestId('cpu-chart')).toBeInTheDocument())`；同時 `expect(screen.getByText(/Backend: ok/i)).toBeInTheDocument()`
- [x] 1.6 跑 `npm test -- toCpuSeries`，三個 case 全 fail（模組不存在）
- [x] 1.7 跑 `npm test -- cpu-chart`，兩個 case 全 fail（`CpuChart.tsx` 不存在 → Vite resolve 失敗）
- [x] 1.8 跑 `npm test -- app`，新增的兩個 chart 斷言 fail；既有三個 case 依擴充的 stub 仍綠
- [x] 1.9 跑 `npm test`，確認後端 `tests/server/*.test.js` 四支（healthz / cpu / memory / disk）仍綠（無 regression）
- [x] 1.10 commit，訊息標註 `stage 5 (red): failing CpuChart + toCpuSeries tests + extended App fetch mock`

## 2. 🟢 Green：建 CpuChart 元件 + 在 App 內 inline CPU fetch + 渲染

- [x] 2.1 新增 `src/components/CpuChart.tsx`：`import { LineChart, Line, XAxis, YAxis } from 'recharts'`、`import type { CpuChartRow } from '../lib/toCpuSeries'`；定義 `type CpuChartProps = { data: CpuChartRow[]; width?: number; height?: number }`；export `function CpuChart({ data, width = 600, height = 300 }: CpuChartProps)` —— 回傳 `<div data-testid="cpu-chart" role="img" aria-label="CPU usage chart"><LineChart width={width} height={height} data={data}><XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} /><YAxis domain={[0, 100]} /><Line type="monotone" dataKey="usage" dot={{ r: 4 }} /></LineChart></div>`；**不**從 recharts import `ResponsiveContainer`
- [x] 2.2 新增 `src/lib/toCpuSeries.ts`（最小 stub）：`import type { CpuMetricDto } from './api'`；`export type CpuChartRow = { time: number; usage: number }`；`export function toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[] { return dtos.map((d) => ({ time: Date.parse(d.timestamp), usage: d.usagePercent })) }` —— 注意：此時 `CpuMetricDto` 還沒在 `api.ts` 加，先在 `toCpuSeries.ts` 頂端用 inline type alias `type CpuMetricDto = { usagePercent: number; cores: number; timestamp: string }` 取代 import；refactor 階段 (3.x) 才把型別從 `api.ts` import 進來
- [x] 2.3 在 `src/App.tsx` 內 inline 加 CPU fetch（refactor 階段才抽 `useCpu()` hook）：在 `useHealth()` 之外新增 `const [cpuData, setCpuData] = useState<CpuChartRow[] | null>(null)`；`useEffect(() => { let cancelled = false; fetch('/api/metrics/cpu').then((r) => r.ok ? r.json() : Promise.reject(new Error(\`cpu \${r.status}\`))).then((dto) => { if (!cancelled) setCpuData(toCpuSeries([dto])) }).catch(() => { /* swallow — UI 仍渲染空 chart */ }); return () => { cancelled = true } }, [])`；在 JSX 內加 `<section><CpuChart data={cpuData ?? []} /></section>`；header 區塊 `<header>` 包住既有的「Backend: …」readout（不刪除既有顯示）；確保 `Backend: ok` 文字仍出現於成功路徑
- [x] 2.4 修改 `src/App.module.css`：加上 `.page` 內的 `header` / `main` 兩段佈局（如 flex column、main 區塊有 padding 與最小高度）；給 chart 容器（或 `.main`）一個明確 `min-width: 640px; min-height: 320px`（或對應 `<CpuChart>` 預設 width/height）避免 layout 抖動；保留現有 `.readout` 等 class，視覺角標化（小字、低明度）
- [x] 2.5 跑 `npm test -- toCpuSeries`，三個 case 綠
- [x] 2.6 跑 `npm test -- cpu-chart`，兩個 case 綠
- [x] 2.7 跑 `npm test -- app`，五個 case（既有三個 + 新增兩個）全綠
- [x] 2.8 跑 `npm test`，前後端共 10+ 支測試（4 後端 + 3 toCpuSeries + 2 CpuChart + 5 App）全綠
- [x] 2.9 commit，訊息標註 `stage 5 (green): CpuChart renders Recharts LineChart fed by inline /api/metrics/cpu fetch`

## 3. ♻️ Refactor：抽 `src/lib/api.ts` 的 CPU contract、抽 `src/hooks/useCpu.ts`、App 改用 hook

- [ ] 3.1 修改 `src/lib/api.ts`：在現有 `HEALTHZ_ENDPOINT` / `getHealth` 之後加：
    - `export const CPU_ENDPOINT = '/api/metrics/cpu';`
    - `export type CpuMetricDto = { usagePercent: number; cores: number; timestamp: string };`
    - `export async function getCpu(): Promise<CpuMetricDto> { const res = await fetch(CPU_ENDPOINT); if (!res.ok) throw new Error(\`cpu \${res.status}\`); return res.json(); }`
- [ ] 3.2 修改 `src/lib/toCpuSeries.ts`：把 stage 2 inline 的 `type CpuMetricDto = ...` 移除，改為 `import type { CpuMetricDto } from './api'`
- [ ] 3.3 新增 `src/hooks/useCpu.ts`：
    - `import { useEffect, useState } from 'react';`
    - `import { getCpu } from '../lib/api';`
    - `import { toCpuSeries, type CpuChartRow } from '../lib/toCpuSeries';`
    - `export type CpuStatus = 'loading' | 'ok' | 'error';`
    - `export function useCpu() { const [data, setData] = useState<CpuChartRow[] | null>(null); const [status, setStatus] = useState<CpuStatus>('loading'); useEffect(() => { let cancelled = false; getCpu().then((dto) => { if (cancelled) return; setData(toCpuSeries([dto])); setStatus('ok'); }).catch(() => { if (cancelled) return; setStatus('error'); }); return () => { cancelled = true; }; }, []); return { data, status }; }`
- [ ] 3.4 修改 `src/App.tsx`：移除 stage 2 inline 的 `useState<CpuChartRow[] | null>` 與 inline `useEffect` / `fetch`；改為 `import { useCpu } from './hooks/useCpu';`、`const { data: cpuData, status: cpuStatus } = useCpu();`；`<CpuChart data={cpuData ?? []} />` 保持不變；可選地在 chart 容器下方加 `{cpuStatus === 'error' && <p className={styles.notice}>CPU metric unavailable</p>}`（不破測試，testid 仍是 cpu-chart）
- [ ] 3.5 跑 `npm test -- toCpuSeries`、`npm test -- cpu-chart`、`npm test -- app`，全部仍綠
- [ ] 3.6 跑 `npm test`，前後端所有測試全綠
- [ ] 3.7 commit，訊息標註 `stage 5 (refactor): extract useCpu + toCpuSeries from api.ts and rewire App`

## 4. 驗證（對照 `docs/roadmap.md` 階段 #5 驗證指令）

- [ ] 4.1 跑 `npm test -- cpu-chart`，退出碼 0、涵蓋兩個 case（非空 data 渲染 path、空 data 仍 mount）
- [ ] 4.2 跑 `npm test`，退出碼 0、涵蓋全部測試（4 後端 + 3 toCpuSeries + 2 CpuChart + 5 App = 14 支），無 jsdom / node 環境衝突
- [ ] 4.3 開 terminal A 跑 `node server.js`，`:3001` 啟動成功
- [ ] 4.4 開 terminal B 跑 `npm start`，Vite log 顯示 dev URL（通常 `http://localhost:5173/`）
- [ ] 4.5 瀏覽器開 Vite dev URL：header 區看到「Backend: ok」徽章；main 區塊看到 `<CpuChart>` 渲染出 Y 軸 0–100、X 軸時間刻度、一個 dot；DevTools Network 確認 `/healthz` 與 `/api/metrics/cpu` 各被請求一次、均為 200
- [ ] 4.6 暫停 terminal A 後端（Ctrl+C），重整瀏覽器：頁面不 crash，chart 容器仍 mount（dot 消失），「Backend: ok」文字消失（health hook 設 error）；重新跑 `node server.js`，重整後兩者均回復
- [ ] 4.7 跑 `npm run build`，退出碼 0、產出 `dist/`（驗證 Recharts 加入後 Vite production build chain 仍能 compile）

## 5. openspec hygiene

- [ ] 5.1 跑 `openspec validate add-cpu-chart --strict`，退出碼 0
- [ ] 5.2 跑 `openspec status --change add-cpu-chart`，proposal / design / specs / tasks 全部 `done`、tasks 全部 `[x]`
- [ ] 5.3 暫不執行 `/opsx:archive`；等 reviewer 確認 phase #5 通過、瀏覽器驗證跑過再 archive（避免在驗證前把 delta 併入主 spec）
