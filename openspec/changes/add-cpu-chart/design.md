## Context

本 change 是 `docs/roadmap.md` 階段 #5 的落地。在此之前：

- Phase #1 (`2026-05-19-add-healthz`) 交付 `server.js` + `createServer()` + `GET /healthz`。
- Phase #2 (`2026-05-19-add-cpu-metric`) 交付 `/api/metrics/cpu`、`readCpu()` 模式、回傳契約 `{ usagePercent, cores, timestamp }`。
- Phase #3 (`2026-05-19-add-memory-disk-metrics`) 交付 `/api/metrics/memory` / `/api/metrics/disk` 與 `server/metricsRouter.js`。
- Phase #4 (`2026-05-19-add-frontend-skeleton`) 交付前端骨架：Vite + React + TS strict + jsdom + RTL；`<App />` 掛載時 `fetch('/healthz')`；抽出 `useHealth()` hook 與 `src/lib/api.ts`；UI 顯示 `Backend: ok`。

`docs/roadmap.md` 階段 #5 contract：

- 🔴 Red：RTL + 固定 fixture，餵 `<CpuChart data={fixtures.cpu.idle} />`，斷言畫面渲染出對應點數的 `<path>` 或 axis tick。
- 🟢 Green：用 Recharts `<LineChart>` 包出 `<CpuChart>`，接受 props；同時頁面層改成 fetch `/api/metrics/cpu` 一次然後渲染。
- ♻️ Refactor：把資料轉換（API DTO → chart row）抽成 `toCpuSeries()` 純函式並單測。
- 驗證：`npm test -- cpu-chart` 全綠 + `npm run dev`（實際為 `npm start`）後看到一張靜態 CPU 折線。

`docs/tech-stack.md` 已釘定：

- 圖表函式庫 = Recharts（`docs/tech-stack.md` §Frontend 與 §取捨記錄〈為何不選 Chart.js〉）。
- 預設 polling 2s（本 change 只做單次 fetch，polling 屬 phase #6）。
- 樣式 = CSS Modules / 一般 CSS（不引入 Tailwind / styled-components）。
- 效能預算：首屏 LCP < 2 s、單一 metric API < 100 ms（本 change 在預算內：單次 fetch + 一張靜態 chart）。

約束：

- **TDD 強制**（`docs/mission.md` §品質原則）：CpuChart / toCpuSeries / 擴充的 App.test.tsx 都先 fail。
- **守住「靜態 fetch 一次」邊界**：不引入 `setInterval` / `useMetricPolling` / 多次 fetch（那是 phase #6）。
- **既有 phase #4 斷言不可破**：`App.test.tsx` 既有三個 case（happy / error / loading）必須仍綠；`Backend: ok` 字樣繼續存在於 DOM。
- **後端不動**：`/api/metrics/cpu` 已在 `add-cpu-metric` 完成；本 change 不修改 `server.js` / `server/metricsRouter.js` / `tests/server/*`。
- **constitution 不動**：roadmap / tech-stack / mission / CLAUDE.md 都已預先支援 phase #5；不必同步修文字（與 add-frontend-skeleton 的處理不同）。

## Goals / Non-Goals

**Goals:**

- 新增 `<CpuChart data={rows} />` Recharts 元件：渲染 `<LineChart>` + `<XAxis>` + `<YAxis domain={[0, 100]}>` + `<Line dot>`；接受 `CpuChartRow[]`；測試環境可傳固定 width / height props。
- 新增 `toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[]` 純函式：把 `{ usagePercent, cores, timestamp }` 轉成 `{ time, usage }`；可由純單測驗證。
- 新增 `useCpu()` hook：fetch `/api/metrics/cpu` 一次，回 `{ data: CpuChartRow[] | null, status: 'loading' | 'ok' | 'error' }`；與 `useHealth()` 對稱、共用 cancelled flag 模式。
- 修改 `src/lib/api.ts`：export `CPU_ENDPOINT`、`CpuMetricDto`、`getCpu()`。
- 修改 `src/App.tsx`：整入 `useCpu()`；health readout 縮成小角標保留 `Backend: ok` 字樣；主視覺改放 `<CpuChart data={cpu.data ?? []} />`。
- `npm test -- cpu-chart` 與 `npm test` 全綠（既有 healthz / cpu / memory / disk / App 既有 case 全保留）。
- `node server.js` + `npm start` 後瀏覽器：右上 health 徽章「Backend: ok」+ 主區塊 chart（Y 軸 0–100、X 軸時間刻度、單一 dot）。

**Non-Goals:**

- 不實作 polling / `setInterval` / `useMetricPolling`（phase #6）。
- 不加 memory chart / disk chart / `<Dashboard>` 容器（phase #6）。
- 不引入 `<ResponsiveContainer>` 與 RWD media queries（phase #7）。
- 不建立 `tests/fixtures/` 目錄；本 change 的 fixture co-located 在 `src/components/CpuChart.fixtures.ts`（phase #8 再決定搬遷）。
- 不引入 `msw` / Service Worker / API mock library；fetch mock 續用 `vi.stubGlobal`。
- 不引入 React Query / SWR / Zustand 等 state library。
- 不引入 chart 動畫 / tooltip / legend 自訂；Recharts 預設行為足夠 phase #5 驗證。
- 不暴露 chart「最近一次更新時間」UI；那是 phase #6 polling 才有意義。
- 不修改 `server.js` / `server/metricsRouter.js` / `tests/server/*` / `docs/*` / `CLAUDE.md` / `package.json` 的非 deps 區段。

## Decisions

### 1. Chart row 型別：`{ time: number /* epoch ms */, usage: number }`

**選擇**：

```ts
// src/lib/toCpuSeries.ts
export type CpuChartRow = { time: number; usage: number };
```

`time` 採 epoch ms（`Date.parse(timestamp)`），`usage` 採 `usagePercent` 原值（0–100）。

**為何**：

- Recharts `<XAxis type="number" domain={['dataMin', 'dataMax']}>` + `tickFormatter` 處理數值時序最穩定；字串時間軸需要額外 parse 邏輯，且 dataMin/dataMax 計算會踩到「字典序 vs 時間序」不一致的雷。
- `time` 是 number 後，phase #6 polling 後做時間視窗（如「最近 60 秒」）只要 `row.time >= now - 60_000`，無需再解析。
- ISO 字串保留在 DTO 層（`CpuMetricDto.timestamp`），boundary 在 `toCpuSeries`；UI 不接觸字串時間。

**替代方案考慮**：

- `time: string`（直接傳 ISO）：捨棄。Recharts XAxis 視為類別軸，間距不反映實際時間差；phase #6 多點時 X 軸會被等距擠開。
- `time: Date`：捨棄。Recharts 對 `Date` instance 的處理依版本而異；serializable 程度也比 number 差。
- `time: 'HH:mm:ss'` 字串：捨棄。把顯示格式釘進資料層，後續想換時區或格式時要動 fixture。

### 2. `toCpuSeries` 簽名：`(dtos: CpuMetricDto[]): CpuChartRow[]`

**選擇**：array-in / array-out。

```ts
export function toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[] {
  return dtos.map((d) => ({ time: Date.parse(d.timestamp), usage: d.usagePercent }));
}
```

Phase #5 餵 `[dto]`、得 `[row]`；phase #6 polling 累積後直接餵 array。

**為何**：

- 純 `map`，無 side effect，單測極易（空陣列 → `[]`、單筆 → 1 列、多筆順序保留、`time` 等於 `Date.parse(timestamp)`、`usage` 等於 `usagePercent`）。
- Phase #6 polling hook 累積多筆 DTO，可直接 `toCpuSeries(dtos)`；簽名不需要再改。
- Roadmap Refactor 步驟字面是「API DTO → chart row 抽成 `toCpuSeries()` 純函式」；array-in / array-out 比 single-in / single-out 更貼合「series」字面意思。

**替代方案考慮**：

- `(dto: CpuMetricDto): CpuChartRow`（單筆轉單筆）：捨棄。phase #6 還要在 hook 內 `dtos.map(toCpuSeries)`，多一層樣板。
- `(dto: CpuMetricDto, prevRows: CpuChartRow[]): CpuChartRow[]`（增量 append）：捨棄。push state 進純函式違反「純」精神；phase #6 的累積邏輯應在 hook 內。

### 3. `useCpu()` 介面：`{ data, status }`，fetch 一次後不再呼叫

**選擇**：

```ts
// src/hooks/useCpu.ts
export function useCpu() {
  const [data, setData] = useState<CpuChartRow[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    let cancelled = false;
    getCpu()
      .then((dto) => {
        if (cancelled) return;
        setData(toCpuSeries([dto]));
        setStatus('ok');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => { cancelled = true; };
  }, []);
  return { data, status };
}
```

**為何**：

- 與 `useHealth()` 對稱：相同 cancelled flag 模式、相同 tri-state status，唯一差異是多了一個 `data` 欄位（health 不需要）。
- Fetch 一次後 `useEffect` 不再觸發；`[]` deps 守住 phase #5 的「靜態 fetch」邊界。
- `data: null` 初始值代表「還沒到」；component 端 `cpu.data ?? []` 即可 fallback 為空 series，`<CpuChart>` 永遠拿得到 array。
- `toCpuSeries([dto])` 在 hook 內完成；`<App />` / `<CpuChart>` 都不接觸 DTO，UI 邊界乾淨。
- Phase #6 polling hook 將以這個形狀為基底擴：把 `[]` deps 改成 `[interval]`、`useEffect` 內 `setInterval` 累積 array。

**替代方案考慮**：

- `{ status, data, error }` 三欄：捨棄。phase #5 沒用 `error` 欄；YAGNI。
- 暴露 `refetch()` 函式：捨棄。靜態 fetch 不需要；phase #6 polling 也用 interval 不用手動觸發。
- 把 fetch 留在 `App.tsx` 內 inline，不抽 hook：捨棄。Roadmap Refactor 字面要求抽 hook（與 `useHealth()` 對稱）；本 change 直接在 refactor 階段抽出（不必走 inline → 抽 hook 兩步）。

### 4. `<CpuChart>` props：`{ data: CpuChartRow[], width?: number, height?: number }`

**選擇**：

```tsx
type CpuChartProps = {
  data: CpuChartRow[];
  width?: number;
  height?: number;
};

export function CpuChart({ data, width = 600, height = 300 }: CpuChartProps) {
  return (
    <div data-testid="cpu-chart" role="img" aria-label="CPU usage chart">
      <LineChart width={width} height={height} data={data}>
        <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} />
        <YAxis domain={[0, 100]} />
        <Line type="monotone" dataKey="usage" dot />
      </LineChart>
    </div>
  );
}
```

**為何**：

- `width` / `height` props 預設值兼顧 dev 視覺；測試環境可傳小尺寸（如 400×200）避免 jsdom 警告。
- `data-testid="cpu-chart"` + `role="img"` + `aria-label` 三重識別：
  - `data-testid` 給 RTL 用（`getByTestId('cpu-chart')`）。
  - `role="img"` + `aria-label` 給可及性 + RTL `getByRole('img', { name: /cpu/i })` 雙保險。
- Y 軸 `domain={[0, 100]}` 固定：phase #5 單點時 axis 仍呈現完整 percent 區間；reviewer 能一眼判斷數值高低。
- X 軸 `type="number"` + `domain={['dataMin', 'dataMax']}`：時間軸自動 fit 到資料範圍；單點時 dataMin === dataMax，Recharts 仍能畫單一 dot。
- `<Line dot>` 啟用：單點時無 dot 就看不到任何渲染；`<Line type="monotone">` 是 Recharts 預設平滑曲線，phase #6 多點時看起來自然。

**替代方案考慮**：

- 用 `<ResponsiveContainer>` 包裝：捨棄。phase #5 不做 RWD（phase #7），且 jsdom 量不到尺寸會噴 warning。
- 不 expose width / height props：捨棄。測試環境需要固定尺寸；不開 prop 就要動 mock。
- Recharts `<Area>` 或 `<Bar>`：捨棄。Roadmap 字面 `LineChart`。

### 5. App 版面：health 縮成小角標，CPU chart 作主視覺

**選擇**：

```tsx
function App() {
  const { status: healthStatus } = useHealth();
  const { data: cpuData, status: cpuStatus } = useCpu();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span data-testid="health-badge" className={styles.badge} data-status={healthStatus}>
          Backend: {healthStatus === 'ok' ? 'ok' : healthStatus === 'error' ? 'error' : '…'}
        </span>
      </header>
      <section className={styles.main}>
        <CpuChart data={cpuData ?? []} />
        {cpuStatus === 'error' && <p>CPU metric unavailable</p>}
      </section>
    </main>
  );
}
```

**為何**：

- `Backend: ok` 字樣留在 `<header>` 區，phase #4 既有 RTL 斷言 `getByText(/Backend: ok/)` 仍綠。
- `<CpuChart>` 在 `<section>` 主視覺區，phase #5 新增的 RTL 斷言 `getByTestId('cpu-chart')` 通過。
- Loading 狀態用 `…` 字符保留 phase #4 的處理方式；error 狀態文字「error」與 phase #4 的「Backend: error」一致（既有 useHealth error case 已測）。
- CPU error 顯示獨立文字 `CPU metric unavailable`，phase #5 的擴充 App.test.tsx 可斷言這條訊息（or 不斷言 — 由本 change spec 決定 scope）。

**替代方案考慮**：

- 完全移除 health readout：捨棄。phase #4 既有 RTL `Backend: ok` 斷言會破；且 health 是 reviewer 確認後端連線的第一道訊號。
- 把 health 與 CPU 並排（同等視覺重）：捨棄。Phase #5 主題是「第一張圖」；health 不該搶版面。
- Health 放在 `<footer>`：捨棄。Header 角落是 dashboard 慣例位置（status indicator）。

### 6. Fixture：co-located 在 `src/components/CpuChart.fixtures.ts`

**選擇**：

```ts
// src/components/CpuChart.fixtures.ts
import type { CpuChartRow } from '../lib/toCpuSeries';

const baseTime = Date.parse('2026-05-19T10:00:00Z');
const sec = 1000;

export const cpu = {
  idle: [
    { time: baseTime + 0 * sec, usage: 6 },
    { time: baseTime + 2 * sec, usage: 8 },
    { time: baseTime + 4 * sec, usage: 5 },
    { time: baseTime + 6 * sec, usage: 12 },
    { time: baseTime + 8 * sec, usage: 9 },
  ] satisfies CpuChartRow[],
};
```

**為何**：

- Co-located 在元件目錄：閱讀 `CpuChart.tsx` 時 fixture 一眼可見；不必跨目錄跳轉。
- 5 個點足以驗證 chart 渲染「多點折線」（≥ 3 點），同時數值落在「閒置」5–15% 區間符合 fixture 命名語意。
- `satisfies CpuChartRow[]`（TS 4.9+）讓 fixture 形狀與型別綁定，型別漂移時 fixture 編譯失敗即可察覺。
- Phase #8 再決定是否平移到 `tests/fixtures/cpu.ts` 並擴 `medium-load` / `peak`；本 change 不預判 phase #8 的目錄與檔名。

**替代方案考慮**：

- 直接寫在 `CpuChart.test.tsx` 內 inline：捨棄。phase #8 平移時要兩處改；且 fixture 重用性低。
- 預先建 `tests/fixtures/cpu.ts`：捨棄。phase #8 才是該目錄的主要交付；本 change 不偷渡。
- Fixture 用 random 產生：捨棄。測試需要可重現；fixture 必須 deterministic。

### 7. jsdom + Recharts：傳固定 width / height，不用 `<ResponsiveContainer>`

**選擇**：測試與正式頁面層都直接給 `<LineChart>` 固定 `width` / `height`；不引入 `<ResponsiveContainer>`。

**為何**：

- jsdom 不會回真實 layout 尺寸（`offsetWidth` / `offsetHeight` 為 0），`<ResponsiveContainer>` 會發 warning 並導致 chart 不渲染；測試會 fail。
- Phase #5 主題不是 RWD（那是 phase #7），把 chart 寬高寫死最簡單也最可控。
- `<CpuChart width? height?>` props 預設值即正式頁面層的尺寸；測試傳較小值（如 400×200）以加速渲染。

**替代方案考慮**：

- 在 `setupTests.ts` mock `ResizeObserver`：捨棄。引入 global mock 影響其他測試；fix 一個視覺問題卻擴大測試副作用面積。
- 包 `<ResponsiveContainer>` + 接受 width / height 為內層 fallback：捨棄。phase #5 不需要 responsive；引入了 phase #7 才處理的複雜度。

### 8. App.test.tsx 擴充策略：URL 分支 stub，新增 chart 斷言

**選擇**：

```ts
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/healthz') return Promise.resolve({
        ok: true, status: 200, json: async () => ({ status: 'ok' }),
      });
      if (url === '/api/metrics/cpu') return Promise.resolve({
        ok: true, status: 200, json: async () => ({
          usagePercent: 7, cores: 8, timestamp: '2026-05-19T10:00:00Z',
        }),
      });
      return Promise.reject(new Error(`unexpected url: ${url}`));
    }),
  );
});
```

新增至少一個 case：mount `<App />`，斷言 `getByTestId('cpu-chart')` 存在；既有三個 case（happy / error / loading）保留並沿用此 stub（happy 改成 health + cpu 都 ok；error 改成兩條都 reject；loading 改成兩條都 never-resolve）。

**為何**：

- URL 分支 stub 把兩條 endpoint 的回應分開描述，testing intent 明確；phase #6 加 memory / disk 時直接擴 stub 表。
- 既有 phase #4 case 沿用 stub 即可，不需改測試結構（DSL 一致）。
- 新增的 chart case 用 `data-testid` 而非 `getByText` —— chart 內部文字（axis tick）依資料而異，testid 比較穩。

**替代方案考慮**：

- 兩個獨立 `vi.fn()` 串接：捨棄。順序依賴脆弱（取決於 React effect 觸發順序）。
- 用 `msw`：捨棄（同 add-frontend-skeleton 的決策）。
- Mock `useHealth` / `useCpu` 而非 fetch：捨棄。會繞過 hook 行為。

### 9. TS 型別共用：DTO 與 chart row 都從 `src/lib/api.ts` / `src/lib/toCpuSeries.ts` export

**選擇**：

```ts
// src/lib/api.ts
export type CpuMetricDto = {
  usagePercent: number;
  cores: number;
  timestamp: string;
};
export const CPU_ENDPOINT = '/api/metrics/cpu';
export async function getCpu(): Promise<CpuMetricDto> { /* ... */ }

// src/lib/toCpuSeries.ts
import type { CpuMetricDto } from './api';
export type CpuChartRow = { time: number; usage: number };
export function toCpuSeries(dtos: CpuMetricDto[]): CpuChartRow[] { /* ... */ }
```

**為何**：

- DTO（後端契約）與 chart row（UI 表現）在不同檔案，邊界清晰；`toCpuSeries` 是兩者之間唯一通道。
- `CpuChartRow` 不放在 `api.ts`：它不是 API 的一部分；放錯檔反而誤導後續閱讀者。
- 兩個型別都從 `lib/` 出，元件 / hook / 測試 import path 一致。

**替代方案考慮**：

- 把 `CpuChartRow` 放在 `CpuChart.tsx` 內：捨棄。`toCpuSeries.ts` 必須 import 它，會產生 component → util 的反向依賴。
- 全部塞 `api.ts`：捨棄。混 API contract 與 UI 表現。

## Risks / Trade-offs

- **[Risk]** Recharts 在 jsdom 環境下某些 sub-component（如 axis tick）的渲染依賴 layout 計算，可能 RTL `getByText` 找不到 tick label → **Mitigation**：測試斷言用 `getByTestId('cpu-chart')`（外層 wrapper）與 `querySelector('path')`（Recharts 一定會渲染的 SVG path），而非 axis tick 文字。若 Recharts 版本升級後行為變動，調整為 `container.querySelector('svg')` 等更穩定的 selector。
- **[Risk]** `<Line dot>` 在單點時 Recharts 預設行為可能仍不畫 dot（不同版本行為不一致）→ **Mitigation**：明確設 `dot={{ r: 4 }}` 或 `dot={true}`；Stage 4 瀏覽器驗證若看到空 chart，把 dot 大小調更明顯。
- **[Risk]** `toCpuSeries` 對 `timestamp` 用 `Date.parse`，若後端送出非 ISO 字串會回 `NaN`，chart X 軸會崩 → **Mitigation**：後端 `readCpu()` 已固定回 ISO 8601（`add-cpu-metric` spec 釘定），契約穩定；`toCpuSeries` 不另加 fallback 以維持「純」精神。若契約破裂，是後端 regression，由後端測試攔截。
- **[Risk]** App 同時兩條 fetch（`/healthz` + `/api/metrics/cpu`），若後端 `node server.js` 未啟動，兩條都會 ECONNREFUSED → **Mitigation**：兩個 hook 各自 try/catch、各自 setStatus('error')；UI 不崩。Reviewer 驗證指令明列「兩個 terminal」。
- **[Risk]** 新增的 chart 渲染在開發機很快（單點），但在 phase #6 累積到 30+ 點後可能拖慢首屏 → **Mitigation**：phase #6 設計時評估 ring buffer 上限（如最近 60 秒 = 30 點 @ 2s interval）；本 change 不處理。
- **[Risk]** `useHealth` 與 `useCpu` 兩個 hook 各觸發 `useEffect`，React 18 strict mode 下會 double-invoke effects → **Mitigation**：兩個 hook 的 cancelled flag 模式已正確處理 double-invoke；不會 setState after unmount。
- **[Trade-off]** Health 縮成小角標 → reviewer 第一眼可能注意不到 backend 連線狀態。可接受，CPU chart 失敗時會獨立顯示 `CPU metric unavailable`；且 health 仍以 `data-status` 屬性 + 視覺顏色變化呈現。
- **[Trade-off]** Y 軸固定 0–100 → 真實 usage 落在 5–20% 時 chart 看起來只用了底部 1/5 面積，視覺資訊密度低。可接受，phase #5 重點是「元件就位 + 軸範圍可預期」；phase #6 累積資料後再評估是否切到 auto-fit 或加 zoom 功能。
- **[Trade-off]** `toCpuSeries` array-in / array-out → phase #5 永遠只餵 1 列。可接受，phase #6 直接繼承簽名零成本。
- **[Trade-off]** Fixture co-located 而非 `tests/fixtures/` → phase #8 平移時要動 import 路徑。可接受，phase #8 本來就是 fixture 重組階段。

## Migration Plan

不適用（純新增）。撤回方式：

1. 移除 `src/components/CpuChart.tsx`、`CpuChart.test.tsx`、`CpuChart.fixtures.ts`、`src/hooks/useCpu.ts`、`src/lib/toCpuSeries.ts`、`src/lib/toCpuSeries.test.ts`。
2. `src/lib/api.ts` 還原：移除 `CPU_ENDPOINT`、`CpuMetricDto`、`getCpu()`。
3. `src/App.tsx` 還原：移除 `useCpu()` 與 `<CpuChart>`；header / main 區塊還原為 phase #4 的 `<main><p>Backend: {status}</p></main>` 結構。
4. `src/App.test.tsx` 還原：移除 URL 分支 stub 與 chart 斷言。
5. `src/App.module.css` 還原：移除 header / main / chart 容器樣式。
6. `package.json` 還原：`dependencies` 移除 `recharts`。
7. 跑 `npm test` 確認 phase #1–#4 測試全綠。

## Open Questions

- **Phase #5 是否要在 App 顯示「上次更新時間」？** Roadmap 沒寫；phase #6 polling 時較有意義。本階段不加，phase #6 設計時再決定。
- **`<CpuChart>` 是否要 export Recharts 子元件以便 phase #6 客製？** 目前不暴露；phase #6 加 memory / disk 時若需要共用 axis / line style 再評估 extract `<ChartShell>`。
- **CPU error 文字是否要 i18n？** 本 change 寫死英文 `CPU metric unavailable`；demo 規模不引入 i18n library。phase #7 RWD 完成後若有需要再開新 change。
- **是否要對 `cores` 欄位做任何展示？** 後端 DTO 已含 `cores`，但 phase #5 只渲染 `usagePercent`；`cores` 暫不展示，phase #6 設計時再決定是否在 chart 標題或 tooltip 顯示。
