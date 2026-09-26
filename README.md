# 貓咪照護排程系統（ccat-scheduler）

選擇客戶、日期區間與時段，一鍵把照護行程寫進 Google 行事曆與共用的 iCloud 行事曆。

- 完整產品規格：[cat-sitting-scheduler-spec.md](cat-sitting-scheduler-spec.md)
- 開發注意事項（Edge Runtime、iOS Safari、Vercel 環境變數）：[CLAUDE.md](CLAUDE.md)

## 功能

- **登入**：使用者名稱（英文字母）＋ 4～6 位數字 PIN，帳號由管理者維護在管理用 Google Sheet 的 `users` 分頁
- **客戶資料庫**：每位使用者各自的 Google Sheet（分頁 `工作表1`），可在 App 內新增、編輯、刪除
- **排程**：日期區間最多 60 天，時段 06:00～23:30（30 分鐘一格），每筆行程固定 1 小時
- **兩種送出方式**

  | 送出方式 | 寫入 | 基本標題 |
  |---|---|---|
  | 送出排程 | Google ＋ iCloud | `［照護］飼主-貓咪（使用者）` |
  | 只加到 Google 行事曆 | 只有 Google | `飼主-貓咪` |

- **Google 事件逐日標題**（兩種送出方式都套用，iCloud 維持基本標題）
  - 只有一天：`單日（基本標題）`
  - 多日的最後一天：`最後一天（基本標題）`
  - 其餘日子：基本標題
- **全有或全無**：任一筆寫入失敗就刪除本次已建立的事件，避免重試後產生重複行程

## 技術架構

- Next.js 16（App Router）＋ React 19 ＋ TypeScript ＋ Tailwind CSS 4
- Google Sheets / Google Calendar：`googleapis`（Service Account）
- iCloud 行事曆：CalDAV（`tsdav`），由後端中轉
- Session：HMAC-SHA256 簽章的 httpOnly cookie
- 部署：Vercel，無資料庫

```
src/
├── app/            頁面（/、/login、/settings）與 API routes
├── components/     ClientList、ClientModal、ScheduleForm 等
├── lib/            Google / iCloud 整合、session、事件時間與標題計算
└── middleware.ts   登入檢查（Edge Runtime）
tests/              單元測試（node --test）
```

## 本機開發

需要 Node.js 22.6 以上（測試直接執行 TypeScript）。

```bash
npm install
```

```bash
cp .env.example .env.local
```

在 `.env.local` 填入以下變數（說明見 `.env.example`）：

| 變數 | 用途 |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service Account 金鑰 JSON（單行） |
| `ADMIN_SHEET_ID` | 管理用 Google Sheet（`users`、`settings` 分頁） |
| `ICLOUD_APPLE_ID` | 共用 iCloud 行事曆的 Apple ID |
| `ICLOUD_APP_PASSWORD` | Apple ID 的 App 專用密碼 |
| `ICLOUD_CALENDAR_NAME` | 要寫入的 iCloud 行事曆名稱 |
| `SESSION_SECRET` | session cookie 簽章金鑰 |

```bash
npm run dev
```

開啟 http://localhost:3000 。

## 測試與檢查

```bash
npm test
```

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

## 部署

推到 GitHub 後由 Vercel 部署。環境變數要用 `printf` 設定，避免帶入換行符：

```bash
printf 'value' | vercel env add NAME production
```

更新環境變數後要重新部署才會生效。

## 首次使用設定

1. 建立 Google Sheet，分頁名稱 `工作表1`，欄位 `id | 飼主姓名 | 貓咪名字 | 照顧地址 | 備註`
2. 把這張 Sheet 分享給 Service Account email（編輯權限）
3. 把自己的 Google 行事曆分享給 Service Account email（「變更活動」權限）
4. 登入後到設定頁填入 Sheets ID 與 Calendar ID

## 機密資料

金鑰、密碼一律放在 `.env.local` 或 Vercel 環境變數，不要寫進任何會被 git 追蹤的檔案。`.claude/settings.local.json` 已排除在 git 之外。
