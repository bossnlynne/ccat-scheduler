# Cat Sitting Scheduler — Product Spec

> 本文件描述目前實作的行為。與最初構想的差異（Google OAuth → PIN 登入、Vite → Next.js、單日 → 日期區間）已直接反映在下方內容。

## 專案目標

建立一個多使用者 Web App，讓使用者從各自的客戶資料庫選擇客戶、指定日期區間與時段，一鍵建立照護行程到行事曆。可選擇同時寫入自己的 Google 行事曆與共用的 iCloud 行事曆，或只寫入 Google 行事曆。

---

## 使用者流程

1. 進入 App，輸入使用者名稱與 PIN 登入
2. 首次使用時到設定頁填入自己的 Google Sheets ID 與 Google Calendar ID
3. 從客戶清單選擇客戶、選日期區間與每日時段
4. 確認預覽後，選擇送出方式：
   - **送出排程** — 同時寫入 Google 行事曆與共用 iCloud 行事曆
   - **只加到 Google 行事曆** — 僅寫入 Google 行事曆

---

## 功能需求

### 1. 登入系統
- 使用者名稱僅限英文字母，搭配 4~6 位數字 PIN
- 可登入的帳號與 PIN 由管理者（Lynne）維護在管理用 Google Sheet 的 `users` 分頁（A 欄帳號、B 欄 PIN）
- 登入狀態存在 HMAC-SHA256 簽章的 httpOnly cookie，未設 maxAge，關閉瀏覽器即需重新登入
- cookie 內容經簽章，無法偽造；簽章金鑰為環境變數 `SESSION_SECRET`

### 2. 客戶資料庫管理
- 每位使用者有各自的 Google Sheets 作為客戶資料庫
- 使用者首次登入後，在個人設定頁填入自己的 Google Sheets ID
- 試算表欄位：`id | 飼主姓名 | 貓咪名字 | 照顧地址 | 備註`（分頁名稱 `工作表1`）
- 貓咪名字格式：多隻以 `/` 分隔（例如：`小花/小虎`），後端直接抓原始內容，不做轉換
- 可新增、編輯、刪除客戶資料
- 每筆客戶資料包含：
  - 飼主姓名（必填）
  - 貓咪名字（必填）
  - 照顧地址（必填）
  - 備註（選填）
- **地址隱私**：客戶清單 API 不回傳照顧地址，避免整份住址一次送到瀏覽器；編輯表單開啟時才單筆取得該客戶的地址

### 3. 排程介面
- 下拉選單選擇客戶（顯示「飼主名 / 貓咪名字」）
- 開始日期與結束日期（各自獨立一行，避免 iOS 上寬度不一致）
- 時段選擇器（06:00 ~ 23:30，以 30 分鐘為單位）
- 每日行程固定為 1 小時
- 日期區間上限 60 天
- 預覽區：顯示筆數、事件標題（兩種模式的標題都會列出，含 Google 的「單日／最後一天」標題）、日期範圍與時段
- 兩個送出按鈕：同時寫入兩個行事曆 / 只寫入 Google 行事曆

### 4. 行事曆整合

#### Google 行事曆（各自的）
- 以 Service Account 寫入使用者在設定頁填的 Calendar ID
- 使用者必須把自己的行事曆共用給 Service Account email 並給「變更活動」權限
- 事件格式：
  - 標題（同時寫入兩個行事曆時）：`［照護］[飼主名]-[貓咪名字]（[使用者名稱]）`
  - 標題（只寫入 Google 時）：`[飼主名]-[貓咪名字]`
  - **逐日標題**（兩種模式的 Google 事件都套用，iCloud 不套用）：
    - 只有一天的行程：`單日（原標題）`
    - 多日行程的最後一天：`最後一天（原標題）`
    - 其餘日子：原標題
    - 來源：使用者指示（2026-09-27）；範圍經確認為「兩種模式的 Google 事件」
  - 地點：照顧地址
  - 時間：選定時間起算 1 小時（23:xx 起始時結束時間會跨到隔日）
  - 描述：飼主名、貓咪名字、地址

#### iCloud 行事曆（共用）
- 使用 CalDAV 協議寫入（`tsdav`）
- 所有使用者的排程都新增到同一個 iCloud 行事曆（Lynne 有編輯權限的那個）
- iCloud 憑證（Apple ID、App Password、行事曆名稱）由管理者統一設定在後端，使用者不需個別設定
- 事件內容與 Google 行事曆相同（標題使用「同時寫入」格式，**不加**「單日／最後一天」前綴）
- 因瀏覽器 CORS 限制，CalDAV 請求透過後端中轉

#### 失敗處理
- **全有或全無**：整批事件任一筆失敗，就把該次已建立的事件全部刪除後回報錯誤
- 同時寫入模式下若 iCloud 失敗，會回滾先前寫入 Google 的事件，避免使用者重試後產生重複行程

---

## 技術架構

### 前端
- **框架**：Next.js App Router（React Server Components + Client Components）
- **語言**：TypeScript
- **樣式**：Tailwind CSS
- **狀態管理**：useState
- **RWD**：支援桌機與手機（以 375px 寬度驗證）

### 後端（Next.js Route Handlers）
- **CalDAV 中轉**：`tsdav` 套件處理 iCloud 寫入
- **Google Sheets 讀寫**：`googleapis` 套件（Service Account）
- **Google Calendar 寫入**：`googleapis` 套件（Service Account）
- **使用者白名單與 PIN**：管理用 Google Sheet 的 `users` 分頁
- **部署**：GitHub + Vercel

### 資料儲存
- 客戶資料：各自的 Google Sheets
- 使用者的個人設定（sheetId、calendarId）：管理用 Google Sheet 的 `settings` 分頁
- iCloud 憑證、Service Account 金鑰、session 簽章金鑰：Vercel 環境變數

---

## 頁面結構

```
/login
└── 輸入使用者名稱 + PIN

/ (首頁)
├── 左側 / 上方（手機）：客戶資料庫
│   ├── 客戶清單（從 Google Sheets 載入，不含地址）
│   └── 新增 / 編輯客戶的 Modal（含地址欄位）
└── 右側 / 下方（手機）：排程介面
    ├── 選擇客戶（下拉）
    ├── 開始日期 / 結束日期
    ├── 選擇時段
    ├── 事件預覽
    ├── 送出排程（Google + iCloud）
    └── 只加到 Google 行事曆

/settings（個人設定）
└── 填入自己的 Google Sheets ID 與 Google Calendar ID
```

---

## 事件格式範例

同時寫入兩個行事曆：

- **標題**：`［照護］陳小明-小花/小虎（lynne）`
- **地點**：`台北市大安區復興南路一段100號`
- **開始**：`2026-06-10T10:00:00+08:00`
- **結束**：`2026-06-10T11:00:00+08:00`
- **描述**：
  ```
  飼主：陳小明
  貓咪：小花/小虎
  地址：台北市大安區復興南路一段100號
  ```

只寫入 Google 行事曆時，標題改為 `陳小明-小花/小虎`，其餘欄位相同。

Google 事件的逐日標題（以 6/10～6/12 三天為例，同時寫入模式）：

| 日期 | Google 行事曆 | iCloud 行事曆 |
|---|---|---|
| 6/10 | `［照護］陳小明-小花/小虎（lynne）` | `［照護］陳小明-小花/小虎（lynne）` |
| 6/11 | `［照護］陳小明-小花/小虎（lynne）` | `［照護］陳小明-小花/小虎（lynne）` |
| 6/12 | `最後一天（［照護］陳小明-小花/小虎（lynne））` | `［照護］陳小明-小花/小虎（lynne）` |

只排 6/10 一天時，Google 標題為 `單日（［照護］陳小明-小花/小虎（lynne））`；只寫入 Google 模式則為 `單日（陳小明-小花/小虎）`。

---

## 非功能需求

- 介面語言：繁體中文
- 支援裝置：桌機與手機（RWD）
- 無資料庫，所有持久化資料都在 Google Sheets

---

## 前置作業

### 管理者（Lynne）需完成

1. **Google Cloud Console**
   - 建立專案
   - 啟用 Google Calendar API 和 Google Sheets API
   - 建立 Service Account，下載金鑰 JSON，填入 `GOOGLE_SERVICE_ACCOUNT_KEY`
   - 將管理用 Google Sheet 分享給 Service Account email（需編輯權限）

2. **管理用 Google Sheet**
   - `users` 分頁：A 欄 = 使用者名稱（僅英文字母）、B 欄 = PIN（4~6 位數字），第 1 列為標題列
   - `settings` 分頁：A 欄 = 使用者名稱、B 欄 = sheetId、C 欄 = calendarId（由 App 自動維護）

3. **iCloud App-Specific Password**
   - 前往 [appleid.apple.com](https://appleid.apple.com)
   - 登入與安全性 → 應用程式專屬密碼 → 產生密碼
   - 填入 `ICLOUD_APP_PASSWORD`

4. **部署**
   - 將專案推上已授權的 GitHub repo
   - 在 Vercel 連結該 repo，填入所有環境變數（見 `.env.example`）
   - 環境變數用 `printf 'value' | vercel env add NAME production` 設定，避免帶入換行符

### 一般使用者需完成

1. 建立一張 Google Sheets，分頁名稱 `工作表1`，欄位為：`id | 飼主姓名 | 貓咪名字 | 照顧地址 | 備註`
2. 將試算表分享給 Service Account email 並給編輯權限（管理者會提供這個 email）
3. 將自己的 Google 行事曆分享給 Service Account email，權限選「變更活動」
4. 登入 App 後，在設定頁填入 Sheets ID 與 Calendar ID
