# Mission

## 定位

`system-monitor` 是一個 **教學 / 作品集 demo**：一個用 React + TypeScript 前端與 Node.js 後端打造的本機系統監控儀表板，存在目的是展示工程素養與 UX 判斷，而非提供正式營運的監控服務。

## 目標受眾

- **評閱者** — 沿著 `BACKGROUND.md` 的「Verification Steps」逐項驗收，決定本作品是否達到要求。
- **未來雇主 / 面試官** — 透過 repo 結構、commit history、文件與測試，評估候選人的設計判斷與工程紀律。
- **學習中的自己** — 把每一個技術選型與取捨明文化，作為未來複盤與延伸的起點。

## 成功定義

成功 = `BACKGROUND.md` 中六個「Verification Steps」全數通過，且滿足下列量化標準：

1. **首屏 < 2 秒**：本機 `npm start` 後，瀏覽器 DevTools Performance 量到 Largest Contentful Paint < 2s。
2. **即時更新**：頁面在不重新整理的情況下，CPU / Memory / Disk 數值會隨時間自動更新（預設 polling 2s 間隔）。
3. **RWD**：在桌機（≥ 1280px）、平板（≈ 768px）、手機（≈ 375px）三種寬度下，圖表與版面皆可閱讀、不發生水平捲軸。
4. **≥ 3 個 test scenarios**：`tests/fixtures/` 至少提供三組差異明顯的指標 fixture（如「閒置」、「中等負載」、「尖峰」），對應的 Vitest 案例可獨立執行通過。
5. **正確的圖表渲染**：對固定 fixture，圖表呈現的形狀與數值與輸入一致（snapshot 或斷言皆可）。

## 非目標

本 demo 明確 **不做** 下列項目；這些屬於正式產品才有意義的功能：

- **多用戶 / 多租戶**：只服務本機一位使用者，不做使用者切換或隔離。
- **認證與授權**：沒有登入、權限、token、session。
- **長期儲存 / 歷史資料**：指標只活在 process 記憶體裡，重啟即丟，不接資料庫或時序資料庫。
- **告警 / 通知**：不發 email、不打 webhook、不接 PagerDuty。
- **生產級可觀測性**：不做分散式追蹤、log shipping、SLO 計算。
- **NetData 整合**：`BACKGROUND.md` 雖允許，但本專案明確選擇直接以 Node.js 採集；理由見 [`tech-stack.md`](./tech-stack.md) 取捨記錄。

## 品質原則

### TDD 強制（red → green → refactor）

**任何執行碼的變更，都必須先寫一個會失敗的測試。** 這是專案級紀律，不是某個 feature 的偏好。

工作流：

1. 🔴 **Red** — 先補上對應的 Vitest / Supertest / React Testing Library 測試，並親眼確認它 fail。
2. 🟢 **Green** — 寫出最小、最直接的實作，讓該測試（且僅該測試）通過。
3. ♻️ **Refactor** — 在綠燈狀態下整理命名、抽函式、消除重複；測試持續通過。

例外處理：

- **純視覺 / RWD 微調** 等難以自動化驗證的變更，可改以手動驗證，但必須在 commit message 或 PR 描述中說明「為何以手動驗證代替」。
- **文件、設定檔（不影響執行）的變更** 不需配對測試。
- 不要默默跳過測試；跳過必須有顯式紀錄。

### 每個 PR 都附對應測試

對應上述 TDD 紀律，任何引入或修改執行碼的 PR 都必須在 diff 中可見對應測試的新增或調整。reviewer 有權因為「沒測試」單獨退回 PR。

### 測試框架已釘定

Vitest 一統前後端、Supertest 負責 API、React Testing Library 負責 UI。細節與替代方案討論見 [`tech-stack.md`](./tech-stack.md)。
