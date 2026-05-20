## Context

本 change 是 `docs/roadmap.md` 階段 #6 的落地。在此之前：

- Phase #1 (`2026-05-19-add-healthz`) 交付 `server.js` + `createServer()` + `GET /healthz`。
- Phase #2 (`2026-05-19-add-cpu-metric`) 交付 `/api/metrics/cpu` 與 `readCpu()`，contract `{ usagePercent, cores, timestamp }`。
- Phase #3 (`2026-05-19-add-memory-disk-metrics`) 交付 `/api/metrics/memory` 與 `/api/metrics/disk`、`server/metricsRouter.js` 統一 dispatch。
- Phase #4 (`2026-05-19-add-frontend-skeleton`) 交付 Vite + React + TS strict + RTL 骨架；`useHealth()`、`src/lib/api.ts`、`Backend: ok` UI。
- Phase #5 (`2026-05-20-add-cpu-chart`) 交付 `<CpuChart>` Recharts LineChart、`toCpuSeries` 純函式、`useCpu` 單次 fetch hook、`src/lib/api.ts` 的 `CPU_ENDPOINT` / `CpuMetricDto` / `getCpu`、`<App>` header 徽章 + 主視覺 CPU 圖。

`docs/roadmap.md` 階段 #6 contract：

- 🔴 Red：Vitest fake timers — mount `<App />`、`advanceTimersByTime(2000)` 多觸發一次 `/api/metrics/cpu` fetch；memory / disk 兩張圖各補一支渲染測試。
- 🟢 Green：寫 `useMetricPolling(endpoint, intervalMs)`、預設 2000ms；頁面層接 CPU / Memory / Disk 三張圖。
- ♻️ Refactor：三張圖收進 `<Dashboard />`；polling 間隔常數搬進 `src/config.ts` 以便環境變數覆蓋。
- 驗證：`npm test -- polling` 全綠 + `npm run dev` 後三張圖每 2 秒更新。

`docs/tech-stack.md` 已釘定：

- 預設 polling 2s 間隔；升級到 SSE / WebSocket 需先在 tech-stack.md 留下決策紀錄（本 change 不升級）。
- 圖表 = Recharts（已在 stage 5 加入）；LineChart 之外，`<BarChart>` 也是 Recharts 一等公民、不需新增 dep。
- 樣式 = CSS Modules / 一般 CSS；不引入 Tailwind / styled-components。
- 效能預算：首屏 LCP < 2 s（本 change 三張圖在初始尚未累積資料時就近於空 chart，LCP 不變）、單一 metric API < 100 ms（後端已預算內）、polling 預設 2 s（可被 env 覆蓋）。

約束：

- **TDD 強制**（`docs/mission.md` §品質原則）：每支新增程式碼都先有失敗測試。
- **後端不動**：所有 metric API 已在 phase #2 / #3 交付；本 change 不修改 `server.js` / `server/metricsRouter.js` / `tests/server/*`。
- **既有 phase #4 / #5 斷言不可破**（部分例外）：
  - `Backend: ok` 文字必須繼續在 DOM 中（phase #4 斷言）。
  - `<CpuChart>` data-testid="cpu-chart" 必須在頁面上存在（phase #5 斷言，但會搬進 `<Dashboard />` 內，仍可被 `getByTestId` 找到）。
  - **例外**：phase #5 archived spec 的「App calls /api/metrics/cpu exactly once during mount」必須 MODIFY 為「at least once + 每 `POLL_INTERVAL_MS` 額外一次」，因為 polling 是本階段的核心交付。
- **constitution 不動**：roadmap / tech-stack / mission / CLAUDE.md 都已預先支援 phase #6；本 change 不必修文字。

## Goals / Non-Goals

**Goals:**

- 新增 `useMetricPolling<TDto, TRow>(fetcher, transform, intervalMs?, historyLimit?)` 通用 hook：mount 後立即觸發一次 fetch、之後每 `intervalMs` 觸發一次；內部維護 `TDto[]` ring buffer（上限 `historyLimit`）；回傳 `{ data: TRow[] | null, status: 'loading' | 'ok' | 'error' }`；cleanup 時清 interval + 防 setState after unmount。
- 新增三個 wrapper：`useCpu` (重寫)、`useMemory`、`useDisk`，各自綁定 endpoint + transform。
- 新增 `<MemoryChart>` (LineChart) 與 `<DiskChart>` (BarChart) 元件；介面與 `<CpuChart>` 高度對稱（接 data + 選填 width/height、`data-testid`）。
- 新增 `<Dashboard>` 容器：呼叫三個 hook、渲染三張圖、各自顯示 error notice；`<App>` 縮減為 `<header>`（health badge）+ `<Dashboard>`。
- 新增 `src/config.ts`：`POLL_INTERVAL_MS`（fallback 2000）與 `METRIC_HISTORY_LIMIT`（fallback 30）；可被 `VITE_POLL_INTERVAL_MS` / `VITE_METRIC_HISTORY_LIMIT` 環境變數覆蓋；parse 失敗 fallback。
- 新增 `toMemorySeries` (`StampedMemoryDto[] → MemoryChartRow[]`) 與 `toDiskSnapshot` (`DiskMetricDto[] → DiskMountBar[]`) 純函式。
- 修改 `src/lib/api.ts`：新增 `MEMORY_ENDPOINT` / `MemoryMetricDto` / `getMemory()` 與 `DISK_ENDPOINT` / `DiskMetricDto` / `getDisk()`。
- 驗證：`npm test -- polling` 與 `npm test` 全綠；`node server.js` + `npm start` 後三張圖每 2 秒更新；停 backend 後三張圖容器仍 mount。

**Non-Goals:**

- 不實作 SSE / WebSocket（polling 預算內）。
- 不引入 React Query / SWR / Zustand 等 state library。
- 不引入 `<ResponsiveContainer>` 與 RWD media queries（phase #7）。
- 不建立 `tests/fixtures/` 目錄；fixture 仍 co-located 在 `src/components/`（phase #8）。
- 不修改 `server.js` / `server/metricsRouter.js` / `tests/server/*` / `vite.config.ts` / `package.json`（無新 dep）/ `docs/*` / `CLAUDE.md`。
- 不引入 chart tooltip / legend 動畫等視覺增強（phase #7 / #8 再評估）。
- 不暴露「最近一次更新時間」UI；reviewer 透過 DevTools Network 確認 polling 頻率即可。
- 不對 disk chart 提供時序視覺；disk 即 snapshot。
- 不在後端為 memory / disk DTO 補 timestamp 欄位（client-side stamp 已足夠 stage 6 / #7 / #8）。

## Decisions

### 1. `useMetricPolling` 介面：`(fetcher, transform, intervalMs?, historyLimit?)`，回 `{ data, status, lastUpdatedAt }`

**選擇**：

```ts
// src/hooks/useMetricPolling.ts
export type PollingStatus = 'loading' | 'ok' | 'error';

export function useMetricPolling<TDto, TRow>(
  fetcher: () => Promise<TDto>,
  transform: (dtos: TDto[]) => TRow[],
  intervalMs: number = POLL_INTERVAL_MS,
  historyLimit: number = METRIC_HISTORY_LIMIT,
): {
  data: TRow[] | null;
  status: PollingStatus;
  lastUpdatedAt: number | null;
} {
  const fetcherRef = useRef(fetcher);
  const transformRef = useRef(transform);
  fetcherRef.current = fetcher;
  transformRef.current = transform;

  const [history, setHistory] = useState<TDto[]>([]);
  const [status, setStatus] = useState<PollingStatus>('loading');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

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
        setLastUpdatedAt(Date.now());
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, historyLimit]);

  const data = history.length === 0 ? null : transformRef.current(history);
  return { data, status, lastUpdatedAt };
}
```

**為何**：

- **Generic + 兩個泛型參數**：TDto（API DTO 形狀）與 TRow（chart row 形狀）分開，因為 transform 是 type-converter；wrappers 把兩個型別綁緊。
- **`fetcher` / `transform` via ref**：呼叫端通常傳 inline arrow（例如 `() => useMetricPolling(getCpu, toCpuSeries)`），如果直接放進 `useEffect` deps，每次 render 都會重建 interval，polling 就完全失效。Ref 模式讓 `useEffect` 只在 `intervalMs` / `historyLimit` 變動時重建 interval（基本上不會變）。
- **`data: null` when history empty**：與 stage 5 `useCpu` 的 null contract 一致；component 層 `data ?? []` fallback 給 chart。
- **Ring buffer 用 `slice(-N)`**：每 tick `O(N)` 拷貝，N = 30 量級無效能問題；保留時間順序、不需特殊 ring 結構。
- **Cancelled flag + clearInterval**：unmount 後 fetch resolve 不會 setState；interval 不再觸發。
- **`lastUpdatedAt: number | null`**：每次 polling tick 成功後寫入 `Date.now()`；失敗分支不動，避免 error 被當作 fresh。Dashboard 用這個欄位在 DiskChart 下方畫「Last updated: HH:MM:SS」，因為 disk snapshot 沒時序、bar 長度跨 tick 幾乎不變，沒有這個視覺訊號 reviewer 會懷疑 polling 是否在跑。CPU / Memory 的 LineChart 每 tick 多一個 dot，已自帶 liveness 訊號，所以不顯示文字。

**替代方案考慮**：

- 傳 `endpoint: string` 而非 `fetcher`：捨棄。roadmap 字面 `useMetricPolling(endpoint, intervalMs)`，但 endpoint string 無法表達 DTO 型別、也無法支援 memory 的 client-side stamp 包裝；wrappers 抽象 endpoint 進去更乾淨。
- 不用 ref，依賴呼叫端傳 stable 函式：捨棄。wrappers 內 `useMetricPolling(getCpu, toCpuSeries)` 確實 stable（module-scope import），但 typer 不檢查；ref 模式對誤用更友善。
- 直接 expose history（raw DTO array）給呼叫端：捨棄。違反「transform 在 hook 內」的封裝；test 也更麻煩。
- `useReducer` 取代 useState：捨棄。state 只有兩格（history、status），reducer 過度設計。

### 2. Roadmap 字面是 `useMetricPolling(endpoint, intervalMs)`，本 change 實際 `(fetcher, transform, intervalMs?, historyLimit?)`：偏離說明

**選擇**：偏離 roadmap 字面，採 fetcher + transform 雙函式介面。

**為何**：

- Roadmap 字面是「最小可解的介面提示」；實作層需要表達三件事：(a) 怎麼 fetch、(b) 怎麼 transform 成 chart row、(c) 怎麼決定 history 上限。endpoint string 無法表達 transform 與 memory 的 stamp 包裝。
- Wrappers (`useCpu` / `useMemory` / `useDisk`) 把這個複雜度封住；page-level 程式碼仍只看到 `useCpu()` 一行 — 符合 roadmap 的精神。
- `docs/tech-stack.md` 沒有規定 hook 介面，所以本 change 不違反 constitution。
- Reviewer 驗收命令 `npm test -- polling` 抓 wrapper 與 generic hook 的測試檔名（皆含 polling 或 useMetricPolling）— 不被偏離影響。

**替代方案考慮**：

- 嚴格按字面：`useMetricPolling(endpoint, intervalMs)` 回 raw DTO array，呼叫端自行 transform。捨棄，理由見上 §1。
- 三個獨立 hook（useCpu / useMemory / useDisk）各自完整實作，不抽通用 hook：捨棄。違反 DRY；ring buffer + interval 邏輯三份複製、bug 三份修。
- 把 `historyLimit` 寫死 30：捨棄。fixture 注入或單測時可能要 N=1 或 N=100，留 prop 更靈活；config 仍提供預設值。

### 3. Memory client-side timestamp：在 wrapper fetcher 補 `timestamp`，讓 transform 介面對稱

**選擇**：

```ts
// src/hooks/useMemory.ts
import type { MemoryMetricDto } from '../lib/api';
type StampedMemoryDto = MemoryMetricDto & { timestamp: string };
const getStampedMemory = async (): Promise<StampedMemoryDto> => ({
  ...(await getMemory()),
  timestamp: new Date().toISOString(),
});
export const useMemory = () => useMetricPolling(getStampedMemory, toMemorySeries);

// src/lib/toMemorySeries.ts
import type { StampedMemoryDto } from '../hooks/useMemory';
export type MemoryChartRow = { time: number; usage: number };
export function toMemorySeries(dtos: StampedMemoryDto[]): MemoryChartRow[] {
  return dtos.map((d) => ({ time: Date.parse(d.timestamp), usage: d.usagePercent }));
}
```

**為何**：

- 後端 memory DTO 不含 timestamp（archive 後 spec 已固定）；time-series chart 需要 x 軸時間值。
- Wrapper 補一個 client-side ISO timestamp，與 CPU server-side timestamp 同型別、同 parse 路徑；`toMemorySeries(dtos)` 介面 mirror `toCpuSeries(dtos)`（array-in / array-out）。
- 時間誤差：client clock vs server clock 通常 < 1s（NTP 同步），對 2s polling 的視覺呈現可忽略。
- 後端不動：無需修改 metricsRouter 或 spec；client-side stamp 是純前端決策。

**替代方案考慮**：

- 後端 memory DTO 補 `timestamp`：捨棄。會破壞 phase #3 archived spec，且需開新 backend change；client-side stamp 已足夠 demo 規模。
- Hook 內統一加 timestamp（不用 wrapper）：捨棄。會強迫所有 wrapper 共用同樣的 timestamp 策略；CPU 已有 server-side timestamp，再 stamp 一次浪費。
- Memory 不畫時序：捨棄。roadmap 寫「memory / disk 兩張圖」，沒指定形狀；time-series LineChart 與 CPU 對稱、reviewer 一眼看出 polling 在跑。

### 4. Disk 視覺：snapshot BarChart，每個 mount 一條 bar

**選擇**：

```tsx
// src/components/DiskChart.tsx
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import type { DiskMountBar } from '../lib/toDiskSnapshot';

type DiskChartProps = { data: DiskMountBar[]; width?: number; height?: number };

export function DiskChart({ data, width = 600, height = 300 }: DiskChartProps) {
  return (
    <div data-testid="disk-chart" role="img" aria-label="Disk usage chart">
      <BarChart layout="vertical" width={width} height={height} data={data}>
        <XAxis type="number" domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="fs"
          width={100}
          tickFormatter={(fs: string) =>
            fs.split('/').filter(Boolean).pop() ?? fs
          }
        />
        <Bar dataKey="usage" fill="#9affc6" isAnimationActive={false} />
      </BarChart>
    </div>
  );
}
```

YAxis `width={100}` 與 CpuChart / MemoryChart 共用同一個值，確保三張圖的 plot area 起點對齊；`tickFormatter` 取 fs 路徑的 basename（`/dev/disk3s1s1` → `disk3s1s1`、`/` → `/`）才能在 100px 內裝得下標籤而不被裁。`fill="#9affc6"` 接 `--color-ok` 主題色，bar 在暗背景上看得到，而非 Recharts 預設的深紫。`isAnimationActive={false}` 跟兩條 LineChart 的設定一致，理由見 §11。

```ts
// src/lib/toDiskSnapshot.ts
import type { DiskMetricDto } from './api';
export type DiskMountBar = { fs: string; usage: number };
export function toDiskSnapshot(dtos: DiskMetricDto[]): DiskMountBar[] {
  const latest = dtos[dtos.length - 1];
  return latest?.mounts.map((m) => ({ fs: m.fs, usage: m.usagePercent })) ?? [];
}
```

**為何**：

- Disk DTO 本身是「N 個 mount 的 snapshot」— 多 mount × 多時間點是二維資料；用 BarChart 表現「目前每顆硬碟使用率」最直接，reviewer 一眼 grok。
- `layout="vertical"`：水平 bar 對 mount 路徑（字串）較友善（垂直 bar 標籤要旋轉）。
- 只取 latest snapshot：ring buffer 雖累積 30 筆，但 disk 沒時序語意；`toDiskSnapshot` 從 `dtos[dtos.length - 1]` 拿最新 mounts。
- Y 軸 dataKey `fs`：每個 mount 一條 bar；X 軸 domain `[0, 100]` 固定百分比區間。

**替代方案考慮**：

- 多 series LineChart（每個 mount 一條時序線）：捨棄。本機通常只有 1–2 個有效 mount；多 series 視覺擁擠，且 disk usage 變動極慢，線基本平直。
- 單一 LineChart（只取 root /）：捨棄。丟掉「多 mount」資訊；reviewer 看不到完整磁碟狀態。
- Pie / Donut：捨棄。多 mount 時面積比較不易讀；reviewer 比較直觀的是「每顆 0–100 的 bar」。
- 不畫圖，只顯示文字列表：捨棄。「視覺化」是 BACKGROUND.md 明確要求。

### 5. `<Dashboard>` 容器擁有所有 hook，`<App>` 只剩 `<header>` + `<Dashboard>`

**選擇**：

```tsx
// src/components/Dashboard.tsx
export function Dashboard() {
  const cpu = useCpu();
  const memory = useMemory();
  const disk = useDisk();
  return (
    <section data-testid="dashboard" className={styles.dashboard}>
      <CpuChart data={cpu.data ?? []} />
      {cpu.status === 'error' && <p className={styles.notice}>CPU metric unavailable</p>}
      <MemoryChart data={memory.data ?? []} />
      {memory.status === 'error' && <p className={styles.notice}>Memory metric unavailable</p>}
      <DiskChart data={disk.data ?? []} />
      {disk.lastUpdatedAt !== null && (
        <p className={styles.timestamp}>
          {`Last updated: ${new Date(disk.lastUpdatedAt).toLocaleTimeString()}`}
        </p>
      )}
      {disk.status === 'error' && <p className={styles.notice}>Disk metric unavailable</p>}
    </section>
  );
}

// src/App.tsx
export default function App() {
  const { status } = useHealth();
  return (
    <main className={styles.page}>
      <header className={styles.header}>{/* health badge + Backend: ok */}</header>
      <Dashboard />
    </main>
  );
}
```

**為何**：

- Roadmap refactor 字面要求「三張圖收進 `<Dashboard />` 容器」；Dashboard 自然擁有資料 hook。
- `<App>` 只剩 layout（header + main 區），責任清晰。
- Phase #7 RWD：CSS media queries / grid 都在 Dashboard 內處理，App 不動。
- Phase #8 fixture：若需要注入測試資料，可在 Dashboard 之上加 `<Dashboard cpuFixture={...} />` props 或抽 presentational variant；本 change 不預先加 prop（YAGNI）。
- Disk last-updated 文字：phase 6 verification 時 reviewer 反映 disk snapshot bar 跨 tick 幾乎不動，懷疑 polling 是否真的在跑。原 design 把這個 UI 留到 phase #7 / #8，但因為它對 phase #6 的「即時更新」reviewer 驗收項目影響太直接，決定在 phase 6 內就補。實作只多兩件：useMetricPolling 多回 `lastUpdatedAt`、Dashboard 在 DiskChart 後面 render 一行文字。CPU / Memory 不需要這個訊號 — 它們的 LineChart 每 tick 多一個 dot，liveness 已內建。

**替代方案考慮**：

- App 擁有 hook、Dashboard 純 presentational（吃 props）：捨棄。雖然 testing-friendliness 略佳，但本 change 沒 fixture 注入需求；phase #8 真要時再 refactor。
- 不抽 Dashboard，三張圖直接放 App：捨棄。違反 roadmap refactor 字面。
- Dashboard 內 hook，再回 props 給三個 chart：（採用）— 即上方選擇。

### 6. `src/config.ts`：env-overrideable 常數 + parse fallback

**選擇**：

```ts
// src/config.ts
function readNumberEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const POLL_INTERVAL_MS: number = readNumberEnv(
  import.meta.env.VITE_POLL_INTERVAL_MS,
  2000,
);

export const METRIC_HISTORY_LIMIT: number = readNumberEnv(
  import.meta.env.VITE_METRIC_HISTORY_LIMIT,
  30,
);
```

**為何**：

- Vite 慣例：`VITE_` 前綴的環境變數 build-time 注入 `import.meta.env.VITE_*`；reviewer 只需 `VITE_POLL_INTERVAL_MS=500 npm start` 即可改間隔。
- `readNumberEnv` 純函式：env 缺、空字串、非數字、≤0 都 fallback；單測涵蓋。
- 兩個常數共用同一個 parse helper；後續若加更多 numeric env 直接套用。

**替代方案考慮**：

- `process.env.POLL_INTERVAL_MS`：捨棄。Vite browser bundle 不暴露 `process.env`；強行 inject 需要 define 設定，違反 Vite 慣例。
- 不提供 env override，只 export 常數：捨棄。roadmap refactor 字面要「以便環境變數覆蓋」。
- Runtime override（讓使用者在 UI 改）：捨棄。本機 demo 規模，build-time 已足夠。
- Zod / schema 驗證：捨棄。一行 `Number` + `Number.isFinite` 即可，schema lib 過度。

### 7. `useCpu` 從 stage 5 單次 fetch 改為 polling wrapper：spec MODIFIED

**選擇**：

```ts
// src/hooks/useCpu.ts (rewritten)
import { useMetricPolling } from './useMetricPolling';
import { getCpu } from '../lib/api';
import { toCpuSeries } from '../lib/toCpuSeries';

export const useCpu = () => useMetricPolling(getCpu, toCpuSeries);
```

**為何**：

- DRY：`useCpu` / `useMemory` / `useDisk` 三個都是「fetch + transform + ring buffer」同一個模式，差別只在 endpoint 與 transform。
- Stage 5 archived spec 寫 `useCpu` SHALL NOT 使用 `setInterval`；本 change 必須 MODIFY 此 scenario，明文允許 polling。
- 對外介面 `{ data, status }` 不變；既有 `useCpu` 的 loading / ok / error scenarios 仍適用。
- Test：原 `useCpu` test 假設單次 fetch；本 change 在 `useMetricPolling.test.tsx` 涵蓋 polling 行為，原 `useCpu` 級別的測試可保留為簡化版（驗 wrapper bind 正確）或併入 useMetricPolling test。

**替代方案考慮**：

- 保留 stage 5 `useCpu` 邏輯，新增 `useCpuPolling`：捨棄。兩個 hook 並存，semantics confusing；App 也只用得到 polling 版。
- 不重寫 useCpu，由 App 直接呼叫 `useMetricPolling`：捨棄。違反「三個 wrapper」決策（已 user-aligned）；page-level 程式碼也更雜亂。
- `useCpu(intervalMs?: number)` overload：捨棄。intervalMs 預設值已從 config 來，wrappers 不需暴露這個參數。

### 8. App.test.tsx 與 fake timers 隔離策略：新 polling case 自帶 setup/teardown

**選擇**：既有 5 個 case 不動（real timers，沿用 `waitFor`）；新增 polling case 在自己的 `describe`/`beforeEach` 內 `vi.useFakeTimers()` + `afterEach` 內 `vi.useRealTimers()`。

```ts
describe('<App /> polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', /* URL 分支 stub for /healthz + /api/metrics/{cpu,memory,disk} */);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('polls /api/metrics/cpu every POLL_INTERVAL_MS', async () => {
    render(<App />);
    await vi.advanceTimersByTimeAsync(0); // flush microtasks for initial tick
    const countCpu = () => (global.fetch as any).mock.calls.filter(([url]: any[]) => url === '/api/metrics/cpu').length;
    expect(countCpu()).toBeGreaterThanOrEqual(1);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(countCpu()).toBeGreaterThanOrEqual(2);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
    expect(countCpu()).toBeGreaterThanOrEqual(3);
  });
});
```

**為何**：

- 既有 5 個 case 用 `waitFor`，real timers 下行為直觀；強行轉 fake timers 等於改寫所有測試 — 風險面積大。
- Fake timers 影響全域，必須在 `afterEach` 內 `useRealTimers` 把控制權交回；隔離在獨立 `describe` 即可保證。
- `vi.advanceTimersByTimeAsync(0)` 用來 flush microtasks：fetch promise 在 timer 推進前 resolve；fake timer 不會凍結 microtask queue，但 React effect 觸發順序需要 yield 一次。
- 用 `>= 1` / `>= 2` / `>= 3` 而非 `=== N`：避免被 memory / disk 額外的 fetch 干擾（同 effect cycle 啟動三個 hook）；對「polling 在跑」這個性質的斷言已足夠。

**替代方案考慮**：

- 整個檔案改 fake timers：捨棄。改動面積太大；既有 case 行為穩定。
- 抽獨立檔案 `App.polling.test.tsx`：捨棄。增加檔案數；現有 `App.test.tsx` 已足夠容納。
- 不在 App level 測 polling，只在 useMetricPolling test 測：捨棄。roadmap red 階段明文要求「mount `<App />` 後 advanceTimersByTime」— integration 級別的斷言更貼合驗收。

### 9. Ring buffer 30 點 = 60 秒（@ 2s 間隔）；超出後 oldest 被淘汰

**選擇**：`METRIC_HISTORY_LIMIT = 30`；hook 內每 tick 後 `slice(-historyLimit)`。

**為何**：

- 60 秒視窗足以呈現「最近狀態 + 變化趨勢」；X 軸不會無限拉長造成資訊密度下降。
- 30 個 row × 三張圖 × 兩個欄位 ≈ 720 個浮點數，記憶體成本可忽略。
- 可被 `VITE_METRIC_HISTORY_LIMIT` 覆蓋（demo 時想看更長窗口可改）。

**替代方案考慮**：

- 無上限：捨棄。長時間掛著瀏覽器後 X 軸壓縮、記憶體增長。
- 60 / 100 / 150：保留可能性（env override），但預設 30 兼顧視覺密度與記憶體。
- Time-based window（`row.time >= now - 60_000`）：捨棄。比「最後 N 筆」複雜，且測試需 freeze time。

### 10. `<MemoryChart>` 鏡像 `<CpuChart>` 結構

**選擇**：

```tsx
// src/components/MemoryChart.tsx
import { LineChart, Line, XAxis, YAxis } from 'recharts';
import type { MemoryChartRow } from '../lib/toMemorySeries';

type MemoryChartProps = { data: MemoryChartRow[]; width?: number; height?: number };

export function MemoryChart({ data, width = 600, height = 300 }: MemoryChartProps) {
  return (
    <div data-testid="memory-chart" role="img" aria-label="Memory usage chart">
      <LineChart width={width} height={height} data={data}>
        <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} />
        <YAxis domain={[0, 100]} width={100} />
        <Line
          type="monotone"
          dataKey="usage"
          dot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
}
```

CpuChart 鏡像同樣配置 — `YAxis width={100}` 與 DiskChart 對齊，`Line isAnimationActive={false}` 理由見 §11。

**為何**：

- 介面、預設值、testid 命名規則都 mirror `<CpuChart>`；reviewer 一眼看出對稱。
- 不引入 `<ResponsiveContainer>`（與 CpuChart 同樣理由，jsdom 不友善）；phase #7 才處理 RWD。
- 不抽 `<ChartShell>` 共用元件：兩張線圖差異目前只在 testid + aria-label，抽元件反而增加閱讀成本；phase #7 / #8 真要共用樣式再評估。

**替代方案考慮**：

- 抽 `<MetricLineChart>` 共用元件（CPU / Memory 都用）：捨棄。本 change 元件數量已多，過早抽象；兩張圖獨立檔案更易閱讀。
- Memory 改用 AreaChart：捨棄。視覺與 CPU 不一致。

### 11. Recharts `isAnimationActive={false}`：三張圖的 Line / Bar 都關閉動畫

**選擇**：CpuChart 與 MemoryChart 的 `<Line>`、DiskChart 的 `<Bar>` 都設 `isAnimationActive={false}`。

**為何**：

- Recharts `<Line>` 預設動畫期間（~1500ms）會把整個 `<g.recharts-line-dots>` 從 DOM 拔掉，動畫結束才補回；在 2000ms 的 polling 週期下 dot 只在約 25% 的時間內存在。
- CPU 與 Memory 兩個 hook 的 `useEffect` 掛載時間相差 ε 毫秒，interval 永久錯開 → 同一瞬間一張圖在「animating（無 dot）」另一張在「settled（有 dot）」，從 reviewer 視角就是「CPU dots 2s 消失一次，Memory dots 2s 出現一次」的對偶閃爍 — phase 6 verification 時被反映。
- 關掉動畫後 dot 永遠 30 顆掛在 DOM 上，新 tick 直接「跳」到新位置；對 2s polling 的視覺速度而言，tween 不必要。
- BarChart 同樣每 tick 重播 grow 動畫，雖然 disk 數值幾乎不變、視覺差異小，為了一致性也關閉。

**替代方案考慮**：

- 縮短 `animationDuration` 到 < polling interval 的 1/4（如 300ms）：dot 大多時間還是看得到，但 reviewer 仍可能在 polling 邊界看到閃；不如直接關閉乾淨。
- 只關 Memory，留 CPU 動畫：兩張圖視覺不一致，後續維護混亂。
- 留 BarChart 的動畫：disk 數值不變時，grow 仍會每 2s 重播一次，視覺干擾 reviewer 的閱讀。

### 12. 每張 chart 內建一個固定 title heading

**選擇**：`<CpuChart>` / `<MemoryChart>` / `<DiskChart>` 各自在元件內 render 一個 `<h3>`（標題文字寫死為 `CPU Usage` / `Memory Usage` / `Disk Usage`），放在 chart `<div data-testid>` 同層 sibling、用一個 `.chartCard` flex column 包起來。

```tsx
// e.g. src/components/CpuChart.tsx
return (
  <div className={styles.chartCard}>
    <h3 className={styles.chartTitle}>CPU Usage</h3>
    <div data-testid="cpu-chart" role="img" aria-label="CPU usage chart">
      <LineChart ...>...</LineChart>
    </div>
  </div>
);
```

**為何**：

- Reviewer 開瀏覽器時三張圖視覺幾乎一樣（line/bar 都是綠色），靠 X / Y 軸標籤或 testid 才能辨識，違反 BACKGROUND.md 「一眼能看出」的要求。標題是最小、最直觀的補丁。
- 寫死標題文字（不開 prop）：DRY + 與 aria-label 對齊；i18n 需求出現再開新 change。
- `.chartCard` 包起來而非直接 fragment：Dashboard 的 flex `gap` 是 chart 之間用的，title 與 chart 之間要更緊（`.chartCard` 內部用較小的 `gap: var(--space-2)`）。
- `<h3>` 而非 `<h2>`：頁面已有隱含的 `<h1>` 給 readout 區（雖然目前沒明文 h1），保留 h2 給未來區段標題。h3 對應「dashboard 內的單一 chart」層級。

**替代方案考慮**：

- 標題放在 chart `<div data-testid>` 內部：捨棄。`role="img"` 對 screen reader 來說會吞掉內部 heading 的可讀性（aria-label 取代內容），把 heading 拉出來才能讓 AT 把它當獨立 landmark。
- 標題寫進 chart 元件外（Dashboard 自己 render）：捨棄。違反元件自我描述原則；CpuChart 在 phase 8 fixture 變體單獨用時也需要標題。
- 用 prop `title` 開放配置：YAGNI；目前三張圖只有一種文字。

## Risks / Trade-offs

- **[Risk]** `vi.useFakeTimers()` 與 fetch promise 的 microtask flushing 互動 → **Mitigation**：用 `vi.advanceTimersByTimeAsync(ms)`（非 sync 版）；初始 tick 後 `await vi.advanceTimersByTimeAsync(0)` flush；斷言用 `>= N` 而非 `=== N` 避免時序敏感。
- **[Risk]** `useEffect` deps 若包含 inline `fetcher` 會每次 render 重建 interval → **Mitigation**：fetcher / transform 經 ref 抓最新版；`useEffect` deps 只列 `intervalMs` / `historyLimit`。`useMetricPolling.test.tsx` 加一支 case 驗證「rerender 不會重建 interval」（呼叫次數應只增不減）。
- **[Risk]** Memory client-side timestamp 與 CPU server-side timestamp 對齊度 → **Mitigation**：兩者皆 ISO 8601 字串、皆 `Date.parse` 轉 epoch ms；視覺 X 軸來自同一個 client clock 推進，誤差視覺不可見。如果未來需要嚴格對齊，可在後端 memory / disk DTO 補 timestamp（新 change）。
- **[Risk]** Disk DTO 在某些環境（CI / 容器）可能回 0 個 mount → **Mitigation**：`toDiskSnapshot` 對空陣列 / `dtos.length === 0` 都回 `[]`；`<DiskChart data={[]} />` mount 不 crash（Recharts 空資料安全）。test 涵蓋。
- **[Risk]** 三個 polling 同時跑導致 React batching 變慢 → **Mitigation**：React 18 自動批次；三個 hook 各自 interval 不同步發 fetch（mount 時順序觸發 + 同 interval 之後也會錯開 ε 毫秒）；實測前不假設有問題。
- **[Risk]** 累積 30 筆後 `slice(-30)` 每 tick 拷貝陣列 → **Mitigation**：N=30 拷貝成本 O(30)，可忽略；如未來 N 增大可考慮 indexed ring buffer。本 change 不預先優化。
- **[Risk]** Stage 5 archived spec 的 `useCpu does not schedule recurring work` scenario 必須移除 → **Mitigation**：在 specs/frontend-app/spec.md 的 `## MODIFIED Requirements` 區段把整個 `useCpu` requirement 重寫，明文允許 polling；archive 時 delta 會覆寫 main spec。
- **[Risk]** Stage 5 archived spec 的 `App calls /api/metrics/cpu exactly once during mount` scenario 必須調整 → **Mitigation**：同 MODIFIED 區段把 App requirement 改寫為「at least once + polling」。
- **[Trade-off]** Disk 不畫時序 → 與其他兩張圖視覺風格不一致。可接受，因為 disk 即 snapshot 語意，BarChart 更直觀；reviewer 不會誤以為 disk 沒在更新（每 tick BarChart 仍會重渲）。
- **[Trade-off]** Wrappers 三個檔案 + generic hook 一個檔案 → 看起來「多了一層」。可接受，三個 wrapper 各只 2–3 行，可讀性高；DRY 收益遠大於增加的檔案數。
- **[Trade-off]** Memory client-side timestamp → 與後端時鐘不嚴格對齊。可接受，demo 規模差異不可見。
- **[Trade-off]** `isAnimationActive={false}` → 新資料點 / bar 新值不會 tween 過去，而是直接「跳」到新位置。可接受，2 秒 polling 的視覺速度本來就不需要 tween；換來的是 dot 永遠在 DOM 上、可預測。
- **[Trade-off]** Disk `tickFormatter` 取 basename → 同名 mount 路徑會碰撞（例：`/foo/data` 與 `/bar/data` 都顯示成 `data`）。可接受，本機 demo 規模 + macOS 的 mount 命名（disk3s1s1 / disk5s1 / disk7s1）天然不會碰撞；若 phase #7 / #8 推到雲端伺服器才會遇到，到時可改顯示 full path + tooltip。

## Migration Plan

不適用（純擴充 + 內部 refactor）。撤回方式：

1. 移除 `src/config.ts` / `.test.ts`、`src/hooks/useMetricPolling.ts` / `.test.tsx`、`src/hooks/useMemory.ts`、`src/hooks/useDisk.ts`、`src/lib/toMemorySeries.ts` / `.test.ts`、`src/lib/toDiskSnapshot.ts` / `.test.ts`、`src/components/MemoryChart.tsx` / `.test.tsx` / `.fixtures.ts`、`src/components/DiskChart.tsx` / `.test.tsx` / `.fixtures.ts`、`src/components/Dashboard.tsx` / `.test.tsx`。
2. `src/lib/api.ts` 還原：移除 `MEMORY_ENDPOINT` / `MemoryMetricDto` / `getMemory` / `DISK_ENDPOINT` / `DiskMetricDto` / `getDisk`。
3. `src/hooks/useCpu.ts` 還原為 stage 5 版本（單次 fetch + useState / useEffect / cancelled flag）。
4. `src/App.tsx` 還原為 stage 5 版本（直接 useCpu + `<CpuChart>`，不用 `<Dashboard>`）。
5. `src/App.test.tsx` 還原：移除 polling case；既有 5 個 case 保留。
6. `src/App.module.css` 還原：移除 Dashboard 三圖區塊樣式。
7. 跑 `npm test` 確認 phase #1–#5 測試全綠。

## Open Questions

- **Disk BarChart 是否該顯示 `usedBytes / totalBytes` tooltip？** 本 change 不加（YAGNI）；phase #7 RWD 完成後若 reviewer 反映「只有 percent 看不出絕對容量」再開新 change 加 tooltip。
- **Polling 暫停機制（visibility API）？** 標籤頁不可見時可暫停 polling 省 CPU；本 change 不做（本機 demo 通常不切標籤）。如果上 production 或長時間 demo 再評估。
- ~~**是否要顯示「最近一次更新時間」UI？**~~ **已在 phase 6 verification 解決**：reviewer 反映 disk snapshot 看起來像靜止，所以 useMetricPolling 多回 `lastUpdatedAt` 欄位、Dashboard 在 DiskChart 下方 render 一行 `Last updated: HH:MM:SS`（dim gray，與 readout 同色階）。CPU / Memory 不加，因為它們的 LineChart 每 tick 多一個 dot，已有 liveness 訊號。
- **Memory client-side timestamp 是否該抽到 `useMetricPolling` 內部？** 本 change 留在 wrapper 內；如果未來 memory / disk 都需要 client stamp，再考慮把它變成 hook 選項（`{ stamp: true }`）。
- **Dashboard 是否該為三張圖加 title / heading？** 本 change 不加（依賴 chart 內 aria-label）；phase #7 / #8 視覺迭代時再評估。
