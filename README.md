# System Monitoring Dashboard

本專案是一個本機系統監控儀表板 demo，使用 React + TypeScript + Vite
建立前端，並以 Node.js `node:http` 後端提供 CPU、Memory、Disk 等系統指標
API。它的目標是讓評閱者可以快速啟動專案、確認即時資料更新、檢查圖表渲染，
並依照 [`BACKGROUND.md`](./BACKGROUND.md) 的驗證步驟完成審查。

## 專案結構

- `server.js`：後端 API 入口，直接以 `node server.js` 啟動，預設監聽 `3001`。
- `src/`：Vite 前端應用程式。
- `src/components/`：圖表與儀表板元件位置，包含 `CpuChart.tsx`、`MemoryChart.tsx`、`DiskChart.tsx`、`Dashboard.tsx`。
- `tests/fixtures/`：至少三組測試情境資料，用於驗證不同負載狀態下的 DTO 與圖表呈現。
- `docs/`：專案 constitution，包含 [`mission.md`](./docs/mission.md)、[`tech-stack.md`](./docs/tech-stack.md)、[`roadmap.md`](./docs/roadmap.md)。

## 安裝

```bash
npm install
```

## 執行

請開兩個 terminal，分別啟動後端與前端。

第一個 terminal 啟動後端：

```bash
node server.js
```

第二個 terminal 啟動前端 Vite dev server：

```bash
npm start
```

前端預設由 Vite 提供服務，並透過 proxy 將 `/healthz` 與 `/api` 請求轉送到
`http://localhost:3001`。

## 驗證

評閱時可依照下列順序檢查：

1. 執行 `node server.js`，確認後端可以啟動。
2. 執行 `npm start`，在瀏覽器開啟 Vite 顯示的本機網址。
3. 使用瀏覽器 DevTools Performance 檢查本機頁面載入時間符合 `< 2s` 預算。
4. 觀察 CPU、Memory、Disk 數值與圖表會在不重新整理頁面的情況下即時更新。
5. 以桌機、平板、手機寬度檢查 responsive layout，確認沒有水平溢出且圖表可讀。
6. 確認 CPU、Memory、Disk 圖表依照資料正確渲染。

可用下列指令執行自動化測試：

```bash
npm test
```

若要專門驗證提交內容要求的「至少 3 個測試場景」，可執行：

```bash
npm test -- scenarios
```

此指令會檢查 `tests/fixtures/` 中的 `idle`、`medium-load`、`peak`
三組情境，並覆蓋後端 DTO 轉換與前端 CPU、Memory、Disk 圖表渲染。
