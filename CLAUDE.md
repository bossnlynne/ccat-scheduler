@AGENTS.md

# 專案概覽

貓咪照護排程系統 — Next.js App Router + TypeScript + Tailwind CSS，部署於 Vercel。
使用者以「使用者名稱 + PIN」登入，從 Google Sheets 讀取客戶資料，建立排程時寫入 Google Calendar 和 iCloud Calendar。

# 技術架構

- **Runtime**: Next.js App Router (Server Components + Client Components)
- **部署**: Vercel (serverless，無法使用 fs 寫檔)
- **認證**: 使用者名稱 + PIN（比對 admin sheet 的 `users` 分頁），session 存於 HMAC-SHA256 簽章的 cookie（`src/lib/session.ts`），簽章金鑰為 `SESSION_SECRET`
- **資料來源**: Google Sheets API (Service Account) — 無資料庫
- **行事曆**: Google Calendar API (Service Account) + iCloud CalDAV (tsdav)
- **樣式**: Tailwind CSS，極簡風格 (暖灰背景 #f5f3ef、深色文字 #1a1a1a、方正邊框無圓角)

## 排程寫入行為
- 兩種模式：`both`（Google + iCloud，標題 `［照護］飼主-貓咪（使用者）`）與 `google`（只寫 Google，標題 `飼主-貓咪`）
- **全有或全無**：任一筆失敗就回滾已建立的事件（含跨服務回滾），避免使用者重試造成重複事件
- tsdav 的 `createCalendarObject` 不會對 4xx/5xx 拋錯，必須自行檢查 `res.ok`
- 事件固定 1 小時，跨午夜（23:xx 起始）時結束日期要進位，統一走 `src/lib/event-time.ts` 的 `oneHourWindow`

# 開發注意事項

## Vercel 環境變數
- 用 `printf 'value' | vercel env add NAME production` 設定，**不要**用 `<<<` 或 `echo`，會帶入換行符 `\n` 導致 API 認證失敗
- 每次更新環境變數後必須重新部署才會生效

## Edge Runtime / Middleware
- `src/middleware.ts` 執行於 Edge Runtime，不能 import `server-only`、`fs`、`path`、Node 的 `crypto` 等 Node.js 模組
- `src/lib/auth.ts`（常數與驗證正則）和 `src/lib/session.ts`（cookie 簽章）被 middleware import，必須保持 Edge-compatible
- `session.ts` 只用全域 Web Crypto (`crypto.subtle`)，這在 Edge Runtime 可用；不要改成 Node 的 `crypto` 模組
- 所有 Node.js 邏輯放在 `src/lib/auth-server.ts` 或 `src/lib/google-auth.ts`（標記 `server-only`）

## iOS Safari 相容性
- 所有表單元素必須加 `appearance: none; border-radius: 0;` 否則 Safari 會自動加圓角和額外 padding
- `input[type="date"]` 在 Safari 有特殊內建樣式，會撐大超出容器邊界
- 字體大小設 `16px` 以上，否則 iOS Safari 會在 focus 時自動縮放頁面
- Select 元素加 `appearance: none` 後需要自訂下拉箭頭（用 background-image SVG）

## 手機版 RWD
- 容器加 `overflow-hidden` 和 `min-w-0` 防止內容溢出
- 長文字（地址等）用 `break-all` 或 `break-words` 避免撐破版面
- 避免用 `grid-cols-2` 放兩個 date input 並排 — iOS 上容易寬度不一致，改為各自獨立一行
- 測試時務必用 375px 寬度驗證

## Cookie
- session cookie 內容為 `base64url(payload).base64url(HMAC)`，全部是 ASCII，不需 `encodeURIComponent`
- cookie 值一律要驗簽（`readSessionValue`）後才能信任，**不可**把使用者名稱直接當 cookie 值寫入
- 未設 maxAge，關閉瀏覽器即失效；另有 7 天上限的 `iat` 檢查

## Google Sheets
- Sheet tab 名稱 `工作表1` 是實際使用中的 tab 名，修改前需確認
- 用 Service Account 存取，使用者的 Sheet 必須共用給 Service Account email
- `users` tab: A 欄 = 使用者名稱（僅英文字母）, B 欄 = PIN（4~6 位數字）
- `settings` tab: A 欄 = 使用者名稱, B 欄 = sheetId, C 欄 = calendarId

## 客戶地址隱私
- `GET /api/clients` 經 `toPublicClient` 過濾，**不回傳** 照顧地址，避免整份住址一次送到瀏覽器
- 編輯表單需要地址時走 `GET /api/clients/[id]` 單筆取得

# UI 設計規範

- **風格**: 極簡、乾淨、低色彩對比
- **背景**: `#f5f3ef` (暖灰)
- **文字**: `#1a1a1a` (主要)、`#8a8580` (次要/label)、`#b0aaa5` (提示)
- **邊框**: `#e0ddd8`，1px solid，無圓角
- **按鈕**: 主要 = 黑底白字邊框、次要 = 灰邊框文字
- **字體**: Noto Sans TC，font-light 用於大標題
- **間距**: 寬鬆，p-5 / gap-5 為基準
- **不使用 emoji** 於標題和 UI 元素中
