import { getSessionUsername } from "@/lib/auth-server";
import { getUserSettings } from "@/lib/user-settings";
import LogoutButton from "@/components/LogoutButton";
import ClientList from "@/components/ClientList";
import ScheduleForm from "@/components/ScheduleForm";
import { redirect } from "next/navigation";

export default async function Home() {
  const username = await getSessionUsername();
  if (!username) redirect("/login");

  const settings = await getUserSettings(username);
  const hasSheetId = !!settings.sheetId;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#f5f3ef" }}>
      <header className="border-b border-[#e0ddd8] bg-white px-5 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-lg font-light tracking-wide text-[#1a1a1a] sm:text-xl">
            貓咪照護排程
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-[#8a8580] sm:inline">
              {username}
            </span>
            <a
              href="/settings"
              className="border border-[#e0ddd8] px-3 py-1.5 text-xs text-[#1a1a1a] transition-colors hover:bg-[#f5f3ef]"
            >
              設定
            </a>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
        {!hasSheetId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-[#8a8580]">歡迎，{username}</p>
            <p className="mt-2 text-sm text-[#1a1a1a]">
              請先至設定頁填入 Google Sheets ID
            </p>
            <a
              href="/settings"
              className="mt-6 border border-[#1a1a1a] px-6 py-2.5 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white"
            >
              前往設定
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            <div className="w-full min-w-0 lg:w-1/2">
              <ClientList />
            </div>
            <div className="w-full min-w-0 lg:w-1/2">
              <ScheduleForm displayName={username} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
