# 指標情境 Fixtures

第 8 階段使用三組可重現的工作負載 fixtures：

- `idle`：低前景活動、記憶體穩定、磁碟使用量輕。
- `medium-load`：日常工作負載，CPU 與記憶體壓力中等且持續。
- `peak`：短時間接近飽和，CPU、記憶體與磁碟使用量都偏高。

`systemScenarios.ts` 中的每個 fixture 都包含 CPU、memory、disk 的 raw collector-like inputs、預期 backend DTOs，以及預期 frontend chart rows。測試應透過 `loadFixture(name)` 載入 fixtures，不要在測試裡重複 inline 情境資料。
