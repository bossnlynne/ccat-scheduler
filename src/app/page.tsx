import { getSessionUsername } from "@/lib/auth-server";
import { getGoogleTokens } from "@/lib/google-auth";
import { getUserSettings } from "@/lib/user-settings";
import LogoutButton from "@/components/LogoutButton";
import GoogleConnectButton from "@/components/GoogleConnectButton";
import ClientList from "@/components/ClientList";
import ScheduleForm from "@/components/ScheduleForm";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string }>;
}) {
  const username = await getSessionUsername();
  const tokens = await getGoogleTokens();
  const isGoogleConnected = !!tokens;
  const settings = await getUserSettings(username!);
  const hasSheetId = !!settings.sheetId;
  const params = await searchParams;
  const googleError = params.google_error;

  const errorMessages: Record<string, string> = {
    denied: "Google 授權被拒絕，請重新嘗試",
    invalid: "授權過程發生錯誤，請重新嘗試",
    exchange: "無法取得 Google 權杖，請重新嘗試",
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-base font-bold text-gray-900 sm:text-lg">🐱 貓咪照護排程</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-sm text-gray-600 sm:inline">
            歡迎，<span className="font-medium text-gray-900">{username}</span>
          </span>
          <a
            href="/settings"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            設定
          </a>
          <LogoutButton />
        </div>
      </header>

      <main className="flex flex-1 flex-col p-4 sm:p-6">
        {googleError && (
          <p className="mb-4 text-sm text-red-600">
            {errorMessages[googleError] || "發生未知錯誤"}
          </p>
        )}

        {!isGoogleConnected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <p className="text-gray-500">請先連結 Google 帳號以使用排程功能</p>
            <GoogleConnectButton />
          </div>
        ) : !hasSheetId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              ✓ Google 帳號已連結
            </span>
            <p className="text-gray-500">請先至設定頁填入 Google Sheets ID</p>
            <a
              href="/settings"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              前往設定
            </a>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-6 lg:flex-row">
            {/* 客戶資料庫 */}
            <div className="w-full lg:w-1/2">
              <ClientList />
            </div>
            {/* 排程介面 */}
            <div className="w-full lg:w-1/2">
              <ScheduleForm username={username!} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
