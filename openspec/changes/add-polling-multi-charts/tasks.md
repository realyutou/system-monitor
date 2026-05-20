## 1. 🔴 Red：寫 fail 的 config / useMetricPolling / transforms / charts / Dashboard / App polling 測試

- [x] 1.1 新增 `src/config.test.ts`：`import { describe, it, expect } from 'vitest'`；先把 `readNumberEnv` 視為從 `./config` 命名 export（red 階段檔案還沒建），四個 `it`：
    - `it('falls back to default when env is undefined')`：`expect(readNumberEnv(undefined, 2000)).toBe(2000)`
    - `it('falls back to default for empty string')`：`expect(readNumberEnv('', 30)).toBe(30)`
    - `it('falls back to default for non-numeric')`：`expect(readNumberEnv('not-a-number', 2000)).toBe(2000)`
    - `it('falls back to default for non-positive numbers')`：`expect(readNumberEnv('-5', 30)).toBe(30)`; `expect(readNumberEnv('0', 30)).toBe(30)`
    - `it('uses the parsed numeric env when valid')`：`expect(readNumberEnv('500', 2000)).toBe(500)`
- [x] 1.2 新增 `src/lib/toMemorySeries.test.ts`：`import { describe, it, expect } from 'vitest'`、`import { toMemorySeries, type MemoryChartRow } from './toMemorySeries'`；三個 `it`：
    - `it('returns an empty array for empty input')`：`expect(toMemorySeries([])).toEqual([])`
    - `it('maps a single stamped DTO into a single { time, usage } row')`：餵 `[{ usedBytes: 1, totalBytes: 2, usagePercent: 50, timestamp: '2026-05-20T10:00:00Z' }]`；斷言 length=1、`time === Date.parse('...')`、`usage === 50`
    - `it('preserves input order for multiple stamped DTOs')`：三筆 timestamp `10:00:00Z` / `10:00:02Z` / `10:00:04Z`；斷言 `rows[0].time < rows[1].time < rows[2].time`
- [x] 1.3 新增 `src/lib/toDiskSnapshot.test.ts`：三個 `it`：
    - `it('returns an empty array for empty input')`：`expect(toDiskSnapshot([])).toEqual([])`
    - `it('maps the latest DTO mounts into rows')`：單筆 DTO `{ mounts: [{ fs: '/', usedBytes: 1, totalBytes: 2, usagePercent: 50 }, { fs: '/data', usedBytes: 3, totalBytes: 4, usagePercent: 75 }] }`；斷言 length=2、`rows[0] === { fs: '/', usage: 50 }`、`rows[1] === { fs: '/data', usage: 75 }`
    - `it('only uses the last DTO when input has multiple')`：兩筆 DTO，第一筆 `mounts: [{ fs: '/', usagePercent: 10, ... }]`、第二筆 `mounts: [{ fs: '/data', usagePercent: 90, ... }]`；斷言 length=1、`rows[0] === { fs: '/data', usage: 90 }`
- [x] 1.4 新增 `src/components/MemoryChart.fixtures.ts`：`import type { MemoryChartRow } from '../lib/toMemorySeries';`、`const baseTime = Date.parse('2026-05-20T10:00:00Z'); const sec = 1000;`；`export const memory = { idle: [{ time: baseTime + 0 * sec, usage: 50 }, { time: baseTime + 2 * sec, usage: 52 }, { time: baseTime + 4 * sec, usage: 49 }] satisfies MemoryChartRow[] }`
- [x] 1.5 新增 `src/components/MemoryChart.test.tsx`：`afterEach(() => cleanup())`；兩個 `it`：
    - `it('renders an SVG path for non-empty data')`：`render(<MemoryChart data={memory.idle} width={400} height={200} />)`；斷言 `getByTestId('memory-chart')` 存在、`querySelector('svg')` 與 `querySelector('path')` 都不為 null
    - `it('mounts even when data is empty')`：`render(<MemoryChart data={[]} width={400} height={200} />)`；斷言 `getByTestId('memory-chart')` 存在
- [x] 1.6 新增 `src/components/DiskChart.fixtures.ts`：`import type { DiskMountBar } from '../lib/toDiskSnapshot';`；`export const disk = { idle: [{ fs: '/', usage: 45 }, { fs: '/System/Volumes/Data', usage: 68 }] satisfies DiskMountBar[] }`
- [x] 1.7 新增 `src/components/DiskChart.test.tsx`：兩個 `it`：
    - `it('renders an SVG with bars for non-empty data')`：`render(<DiskChart data={disk.idle} width={400} height={200} />)`；斷言 `getByTestId('disk-chart')` 存在、`querySelector('svg')` 不為 null
    - `it('mounts even when data is empty')`：`render(<DiskChart data={[]} width={400} height={200} />)`；斷言 `getByTestId('disk-chart')` 存在
- [x] 1.8 新增 `src/hooks/useMetricPolling.test.tsx`：採用 `vi.useFakeTimers()` + `vi.useRealTimers()` 包夾；用 `renderHook` from `@testing-library/react` 或寫小 wrapper component；測試案例：
    - `it('fetches once on mount')`：mock fetcher `vi.fn().mockResolvedValue({ x: 1 })`；mount；`await vi.advanceTimersByTimeAsync(0)`；`expect(fetcher).toHaveBeenCalledTimes(1)`；`status` 變 `'ok'`
    - `it('fetches once per intervalMs after the initial tick')`：mount + 初始 flush；advance × N、每次 advance 2000；斷言 `fetcher.mock.calls.length >= N + 1`
    - `it('caps history at historyLimit (oldest discarded)')`：fetcher 每次回不同物件（如 `{ n: callCount }`）；transform 用 identity；advance 觸發 ≥ 5 ticks；斷言 returned `data.length <= 3`、最後一個元素的 `n` 是最新的
    - `it('returns "error" when fetcher rejects')`：fetcher reject；`await vi.advanceTimersByTimeAsync(0)`；`status` 變 `'error'`、`data` 仍為 `null`
    - `it('clears interval on unmount')`：mount、`await vi.advanceTimersByTimeAsync(2000)`；記錄 `fetcher.mock.calls.length`；`unmount()`；advance × 3 個 interval；斷言 calls.length 沒增加
    - `it('does not rebuild interval when caller passes a new inline fetcher reference')`：寫一個 parent component 每 render 都建新 inline fetcher（用同一個底層 `vi.fn`）；rerender 觸發 N 次；advance × M 個 interval；斷言 calls.length 只增加 M（不是 N×M）
- [x] 1.9 新增 `src/components/Dashboard.test.tsx`：`vi.stubGlobal('fetch', ...)` URL 分支 stub 涵蓋 cpu / memory / disk；兩個 `it`：
    - `it('mounts all three chart testids on successful initial fetch')`：三條都 resolve；`render(<Dashboard />)`；`await waitFor(() => expect(getByTestId('dashboard')).toBeInTheDocument())`；同時斷言 `getByTestId('cpu-chart')`、`getByTestId('memory-chart')`、`getByTestId('disk-chart')` 都存在
    - `it('renders an error notice when a metric fetch fails')`：cpu/disk resolve、memory reject；斷言 `getByText(/Memory.*unavailable/i)` 存在；三個 testid 仍存在
- [x] 1.10 修改 `src/App.test.tsx`：把既有 5 個 case 抽進新 `describe('<App /> static snapshot', ...)` 區塊（不動 stub 與 timer 行為）；新增 `describe('<App /> polling', ...)`：
    - `beforeEach`：`vi.useFakeTimers()`；stub fetch URL 分支涵蓋 `/healthz` + 三條 metric endpoint
    - `afterEach`：`cleanup()`；`vi.unstubAllGlobals()`；`vi.useRealTimers()`
    - `it('polls /api/metrics/cpu at the configured interval')`：`render(<App />)`；`await vi.advanceTimersByTimeAsync(0)`；helper `const countCpu = () => (global.fetch as any).mock.calls.filter(([url]: any[]) => url === '/api/metrics/cpu').length`；`expect(countCpu()).toBeGreaterThanOrEqual(1)`；`await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)`；`expect(countCpu()).toBeGreaterThanOrEqual(2)`；再 advance 一次；`expect(countCpu()).toBeGreaterThanOrEqual(3)`
- [x] 1.11 跑 `npm test -- config`、`npm test -- toMemorySeries`、`npm test -- toDiskSnapshot`、`npm test -- memory-chart`、`npm test -- disk-chart`、`npm test -- useMetricPolling`、`npm test -- dashboard`、`npm test -- app`，全部新增 / 修改的案例 fail（模組 / 元件不存在）；既有 cpu / toCpuSeries / cpu-chart / healthz 全綠
- [x] 1.12 commit，訊息標註 `stage 6 (red): failing polling hook + transforms + memory/disk charts + dashboard + app polling tests`

## 2. 🟢 Green：實作 config / useMetricPolling / api 擴充 / transforms / charts / wrappers / Dashboard

- [x] 2.1 新增 `src/config.ts`：
    ```ts
    export function readNumberEnv(value: string | undefined, fallback: number): number {
      if (value === undefined || value === '') return fallback;
      const n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    }
    export const POLL_INTERVAL_MS: number = readNumberEnv(import.meta.env.VITE_POLL_INTERVAL_MS, 2000);
    export const METRIC_HISTORY_LIMIT: number = readNumberEnv(import.meta.env.VITE_METRIC_HISTORY_LIMIT, 30);
    ```
- [x] 2.2 修改 `src/lib/api.ts`：在現有 cpu / healthz exports 之後加：
    - `export const MEMORY_ENDPOINT = '/api/metrics/memory';`
    - `export type MemoryMetricDto = { usedBytes: number; totalBytes: number; usagePercent: number };`
    - `export async function getMemory(): Promise<MemoryMetricDto> { const res = await fetch(MEMORY_ENDPOINT); if (!res.ok) throw new Error(\`memory ${res.status}\`); return res.json(); }`
    - `export const DISK_ENDPOINT = '/api/metrics/disk';`
    - `export type DiskMetricDto = { mounts: Array<{ fs: string; usedBytes: number; totalBytes: number; usagePercent: number }> };`
    - `export async function getDisk(): Promise<DiskMetricDto> { const res = await fetch(DISK_ENDPOINT); if (!res.ok) throw new Error(\`disk ${res.status}\`); return res.json(); }`
- [x] 2.3 新增 `src/lib/toMemorySeries.ts`：
    ```ts
    import type { MemoryMetricDto } from './api';
    export type MemoryChartRow = { time: number; usage: number };
    export type StampedMemoryDto = MemoryMetricDto & { timestamp: string };
    export function toMemorySeries(dtos: StampedMemoryDto[]): MemoryChartRow[] {
      return dtos.map((d) => ({ time: Date.parse(d.timestamp), usage: d.usagePercent }));
    }
    ```
- [x] 2.4 新增 `src/lib/toDiskSnapshot.ts`：
    ```ts
    import type { DiskMetricDto } from './api';
    export type DiskMountBar = { fs: string; usage: number };
    export function toDiskSnapshot(dtos: DiskMetricDto[]): DiskMountBar[] {
      const latest = dtos[dtos.length - 1];
      return latest?.mounts.map((m) => ({ fs: m.fs, usage: m.usagePercent })) ?? [];
    }
    ```
- [x] 2.5 新增 `src/hooks/useMetricPolling.ts`：
    ```ts
    import { useEffect, useRef, useState } from 'react';
    import { POLL_INTERVAL_MS, METRIC_HISTORY_LIMIT } from '../config';

    export type PollingStatus = 'loading' | 'ok' | 'error';

    export function useMetricPolling<TDto, TRow>(
      fetcher: () => Promise<TDto>,
      transform: (dtos: TDto[]) => TRow[],
      intervalMs: number = POLL_INTERVAL_MS,
      historyLimit: number = METRIC_HISTORY_LIMIT,
    ): { data: TRow[] | null; status: PollingStatus } {
      const fetcherRef = useRef(fetcher);
      const transformRef = useRef(transform);
      fetcherRef.current = fetcher;
      transformRef.current = transform;

      const [history, setHistory] = useState<TDto[]>([]);
      const [status, setStatus] = useState<PollingStatus>('loading');

      useEffect(() => {
        let cancelled = false;
        const tick = async () => {
          try {
            const dto = await fetcherRef.current();
            if (cancelled) return;
            setHistory((prev) => {
              const next = [...prev, dto];
              return next.length > historyLimit ? next.slice(-historyLimit) : next;
            });
            setStatus('ok');
          } catch {
            if (!cancelled) setStatus('error');
          }
        };
        tick();
        const id = setInterval(tick, intervalMs);
        return () => { cancelled = true; clearInterval(id); };
      }, [intervalMs, historyLimit]);

      const data = history.length === 0 ? null : transformRef.current(history);
      return { data, status };
    }
    ```
- [x] 2.6 重寫 `src/hooks/useCpu.ts`：
    ```ts
    import { useMetricPolling } from './useMetricPolling';
    import { getCpu } from '../lib/api';
    import { toCpuSeries } from '../lib/toCpuSeries';
    export const useCpu = () => useMetricPolling(getCpu, toCpuSeries);
    ```
- [x] 2.7 新增 `src/hooks/useMemory.ts`：
    ```ts
    import { useMetricPolling } from './useMetricPolling';
    import { getMemory, type MemoryMetricDto } from '../lib/api';
    import { toMemorySeries, type StampedMemoryDto } from '../lib/toMemorySeries';

    const getStampedMemory = async (): Promise<StampedMemoryDto> => ({
      ...(await getMemory()),
      timestamp: new Date().toISOString(),
    });
    export const useMemory = () => useMetricPolling(getStampedMemory, toMemorySeries);
    ```
- [x] 2.8 新增 `src/hooks/useDisk.ts`：
    ```ts
    import { useMetricPolling } from './useMetricPolling';
    import { getDisk } from '../lib/api';
    import { toDiskSnapshot } from '../lib/toDiskSnapshot';
    export const useDisk = () => useMetricPolling(getDisk, toDiskSnapshot);
    ```
- [x] 2.9 新增 `src/components/MemoryChart.tsx`：鏡像 `CpuChart.tsx`，把 testid 換為 `memory-chart`、aria-label 換為 `Memory usage chart`、dataKey / domain 不變
- [x] 2.10 新增 `src/components/DiskChart.tsx`：
    ```tsx
    import { BarChart, Bar, XAxis, YAxis } from 'recharts';
    import type { DiskMountBar } from '../lib/toDiskSnapshot';
    type DiskChartProps = { data: DiskMountBar[]; width?: number; height?: number };
    export function DiskChart({ data, width = 600, height = 300 }: DiskChartProps) {
      return (
        <div data-testid="disk-chart" role="img" aria-label="Disk usage chart">
          <BarChart layout="vertical" width={width} height={height} data={data}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="fs" width={120} />
            <Bar dataKey="usage" />
          </BarChart>
        </div>
      );
    }
    ```
- [x] 2.11 新增 `src/components/Dashboard.tsx`：呼叫三個 hook、依序渲染三張圖；error notice 用 `{status === 'error' && <p className={styles.notice}>CPU/Memory/Disk metric unavailable</p>}`；外層 `<section data-testid="dashboard" className={styles.dashboard}>`
- [x] 2.12 修改 `src/App.tsx`：移除 `useCpu` / `<CpuChart>` 的直接呼叫；改為 `<header>` + `<Dashboard />`；保留 `useHealth` + `Backend: ok` 顯示
- [x] 2.13 修改 `src/App.module.css`：加 `.dashboard` 區塊樣式（縱向 flex、gap、padding）；`.notice` 規則可重用既有；如有必要把 `main` 區塊 layout 調整為承載 dashboard 而非單一 chart
- [x] 2.14 跑 `npm test -- config`、`npm test -- toMemorySeries`、`npm test -- toDiskSnapshot`、`npm test -- memory-chart`、`npm test -- disk-chart`，每組分別綠
- [x] 2.15 跑 `npm test -- useMetricPolling`、`npm test -- dashboard`、`npm test -- app`，全綠
- [x] 2.16 跑 `npm test`，前後端所有測試全綠（後端 4 支 + toCpuSeries 3 支 + cpu-chart 2 支 + config / toMemorySeries / toDiskSnapshot / memory-chart / disk-chart / useMetricPolling / dashboard / app 新增與修改的案例）
- [x] 2.17 commit，訊息標註 `stage 6 (green): useMetricPolling + memory/disk charts + Dashboard wired into App`

## 3. ♻️ Refactor：確認 src/config.ts 是 polling 常數唯一來源、清理多餘 inline 常數

- [x] 3.1 全文搜尋 `2000`、`30`（with surrounding context）確認沒有在 hook / Dashboard / App 留下 hard-coded polling 常數；所有引用都應該透過 `POLL_INTERVAL_MS` / `METRIC_HISTORY_LIMIT`
- [x] 3.2 確認 `useCpu` / `useMemory` / `useDisk` 三個 wrapper 都是 1–3 行的薄封裝，沒有重複 ring buffer 邏輯
- [x] 3.3 確認 `Dashboard.tsx` 沒有把三個 hook 的 `data` / `status` 重新命名為過多別名；最小命名（`cpu`、`memory`、`disk`）以利閱讀
- [x] 3.4 跑 `npm test`，全綠（無 regression）
- [x] 3.5 commit，訊息標註 `stage 6 (refactor): pin polling constants to src/config.ts; tidy wrapper shape`

## 4. 驗證（對照 `docs/roadmap.md` 階段 #6 驗證指令）

- [x] 4.1 跑 `npm test -- polling`，退出碼 0（涵蓋 useMetricPolling 6 個 case + App polling 1 個 case）
- [x] 4.2 跑 `npm test`，退出碼 0（全部測試，含後端 4 支 + 前端所有新增 / 修改的案例）
- [ ] 4.3 開 terminal A 跑 `node server.js`，`:3001` 啟動成功
- [ ] 4.4 開 terminal B 跑 `npm start`，Vite log 顯示 dev URL
- [ ] 4.5 瀏覽器開 Vite dev URL，肉眼確認：
    - Header 右上「Backend: ok」徽章常駐
    - 主視覺三張圖：CPU LineChart 每 2s 多一點（最多 30 點後窗口前進）、Memory LineChart 同步、Disk BarChart 每 2s 重渲一次（mount usagePercent 變動可能微小）
    - DevTools Network：`/api/metrics/cpu`、`/api/metrics/memory`、`/api/metrics/disk` 各自每 2s 被請求一次
- [ ] 4.6 暫停 terminal A 後端（Ctrl+C），不重整瀏覽器：三張圖容器仍 mount，各自顯示 error notice；恢復 backend、重整後三張圖再開始累積資料
- [x] 4.7 在 terminal B 改用 `VITE_POLL_INTERVAL_MS=500 npm start`，瀏覽器重整、DevTools Network 量到 fetch 間隔 ≈ 500ms（驗證 env override）；驗完後恢復預設
- [x] 4.8 跑 `npm run build`，退出碼 0（Vite production build 仍能 compile）

## 5. openspec hygiene

- [x] 5.1 跑 `openspec validate add-polling-multi-charts --strict`，退出碼 0
- [ ] 5.2 跑 `openspec status --change add-polling-multi-charts`，proposal / design / specs / tasks 全部 `done`、tasks 全部 `[x]`
- [ ] 5.3 暫不執行 `/opsx:archive`；等 reviewer 確認 phase #6 通過、瀏覽器驗證 4.5–4.7 都跑過再 archive

## 6. 🔁 Refinement during phase 6 verification（reviewer 反映後就地修）

Phase 6 verification 跑 4.3–4.5 期間 reviewer 對畫面提出三個問題，這些修正不另開 openspec change，而是在本 in-flight change 內補完並回填 proposal / design / spec。

### 6.1 三張圖 plot area 對齊 + disk bar 可見度
- [x] 6.1.1 CpuChart / MemoryChart 加 `<YAxis ... width={100}>`；DiskChart 把 `width={120}` 降為 `width={100}`，並補 `tickFormatter={(fs) => fs.split('/').filter(Boolean).pop() ?? fs}` 顯示 basename（`/dev/disk3s1s1` → `disk3s1s1`、`/` → `/`）。
- [x] 6.1.2 DiskChart `<Bar>` 加 `fill="#9affc6"`（接 `--color-ok`），暗背景上可讀。
- [x] 6.1.3 既有測試（51 支）全綠 — spec 沒鎖 YAxis width / Bar fill，視覺微調不破契約。
- [x] 6.1.4 commit `stage 6: align dashboard chart plot areas + brighten disk bars`

### 6.2 Disk 顯示 `Last updated: HH:MM:SS`（解決 design.md Open Questions 的「show last updated time?」）
- [x] 6.2.1 🔴 Red：`useMetricPolling.test.tsx` 加兩個 case（初始 `lastUpdatedAt === null` / 每 tick 後 `typeof ... === 'number'` 且 `second >= first`）；`Dashboard.test.tsx` 加一個 case 斷言 `getByText(/Last updated/i)` 在成功 fetch 後存在。
- [x] 6.2.2 🟢 Green：`useMetricPolling.ts` 多 `useState<number | null>(null)` + 成功分支 `setLastUpdatedAt(Date.now())`；回傳 `{ data, status, lastUpdatedAt }`。`Dashboard.tsx` 在 `<DiskChart>` 後 render `<p className={styles.timestamp}>Last updated: {new Date(disk.lastUpdatedAt).toLocaleTimeString()}</p>`。
- [x] 6.2.3 `src/App.module.css` 加 `.timestamp` 規則（mono、`--color-dim`、`tabular-nums`、`text-align: center`）。
- [x] 6.2.4 跑 `npm test`，51 / 51 全綠（含 3 新 case）。
- [x] 6.2.5 commit `stage 6: surface disk last-updated timestamp under DiskChart`

### 6.3 三張圖鎖 `isAnimationActive={false}`
- [x] 6.3.1 CpuChart / MemoryChart 的 `<Line>` 加 `isAnimationActive={false}`；DiskChart 的 `<Bar>` 同樣加。理由：Recharts 預設動畫期間 `<g.recharts-line-dots>` 整個從 DOM 移除，2s polling 加 ~1500ms 動畫長度導致 dot 只有 25% 時間在 DOM 上；CPU / Memory 兩 hook 啟動相差 ε 毫秒，相位錯開 → 對偶閃爍。
- [x] 6.3.2 既有測試全綠 — spec 沒鎖 animation。
- [x] 6.3.3 commit `stage 6: pin Recharts isAnimationActive=false on Line/Bar so dots stay in DOM`

### 6.4 同步 openspec docs
- [x] 6.4.1 `specs/frontend-app/spec.md`：`useMetricPolling` 回傳擴為 `{ data, status, lastUpdatedAt }` + 加兩個 scenario；Dashboard 加 disk last-updated 段落 + 一個 scenario。
- [x] 6.4.2 `design.md`：Decision #1 / #4 / #5 / #10 code 範例更新；新增 Decision #11 解釋 `isAnimationActive=false`；Risks/Trade-offs 補 animation 與 tickFormatter 兩則；Open Questions 標記「show last updated time?」已解決。
- [x] 6.4.3 `proposal.md`：What Changes 條目補 `lastUpdatedAt` / `.timestamp` 樣式；鎖定的決策 區段補 hook 回傳 / YAxis width / Bar fill / `isAnimationActive` / disk last-updated UI 五條。
- [x] 6.4.4 跑 `openspec validate add-polling-multi-charts --strict`，退出碼 0。
- [x] 6.4.5 commit `stage 6 (docs): sync proposal / design / spec with phase-6 refinements`
