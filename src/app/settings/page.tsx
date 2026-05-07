"use client";

import { useState, useEffect, FormEvent } from "react";

export default function SettingsPage() {
  const [sheetId, setSheetId] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [savedSheetId, setSavedSheetId] = useState("");
  const [savedCalendarId, setSavedCalendarId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (res.ok && data.settings) {
          if (data.settings.sheetId) {
            setSheetId(data.settings.sheetId);
            setSavedSheetId(data.settings.sheetId);
          }
          if (data.settings.calendarId) {
            setCalendarId(data.settings.calendarId);
            setSavedCalendarId(data.settings.calendarId);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    const trimmedSheet = sheetId.trim();
    if (!trimmedSheet) {
      setMessage({ type: "error", text: "請輸入 Google Sheets ID" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetId: trimmedSheet,
          calendarId: calendarId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "儲存失敗" });
        return;
      }

      setSavedSheetId(trimmedSheet);
      setSavedCalendarId(calendarId.trim());
      setMessage({ type: "success", text: "設定已儲存" });
    } catch {
      setMessage({ type: "error", text: "網路錯誤，請稍後再試" });
    } finally {
      setSaving(false);
    }
  }

  const serviceAccountEmail = "sheets-service@cat-sitting-scheduler.iam.gserviceaccount.com";

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#f5f3ef" }}>
      <header className="border-b border-[#e0ddd8] bg-white px-5 py-4 sm:px-8 sm:py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-light tracking-wide text-[#1a1a1a]">設定</h1>
          <a
            href="/"
            className="border border-[#e0ddd8] px-3 py-1.5 text-xs text-[#1a1a1a] transition-colors hover:bg-[#f5f3ef]"
          >
            返回
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 space-y-6">
        {/* 服務帳戶共用說明 */}
        <div className="border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-medium text-amber-800">請先共用資源給服務帳戶</p>
          <p className="mt-1 text-xs text-amber-700">
            Google Sheets 和 Google 行事曆都需要將以下 email 加為編輯者：
          </p>
          <p className="mt-2 border border-amber-200 bg-white px-3 py-1.5 text-xs font-mono text-[#1a1a1a] break-all select-all">
            {serviceAccountEmail}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-[#8a8580]">載入中...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Google Sheets */}
            <div className="border border-[#e0ddd8] bg-white p-6">
              <h2 className="text-base font-medium text-[#1a1a1a]">Google Sheets</h2>
              <p className="mt-2 text-xs text-[#8a8580]">
                填入客戶資料試算表 ID，可從網址中取得：
              </p>
              <p className="mt-2 border border-[#e0ddd8] px-3 py-2 text-xs text-[#8a8580] break-all">
                https://docs.google.com/spreadsheets/d/<span className="font-medium text-[#1a1a1a]">這一段就是 ID</span>/edit
              </p>
              <div className="mt-4">
                <label htmlFor="sheetId" className="block text-xs font-medium text-[#8a8580]">
                  Sheets ID
                </label>
                <input
                  id="sheetId"
                  type="text"
                  value={sheetId}
                  onChange={(e) => setSheetId(e.target.value)}
                  placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                  className="mt-1 block w-full border border-[#e0ddd8] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#b0aaa5] focus:border-[#1a1a1a] focus:outline-none"
                  style={{ fontSize: "16px" }}
                />
                {savedSheetId && (
                  <p className="mt-1 text-xs text-[#b0aaa5]">
                    目前：{savedSheetId.slice(0, 20)}...
                  </p>
                )}
              </div>
            </div>

            {/* Google Calendar */}
            <div className="border border-[#e0ddd8] bg-white p-6">
              <h2 className="text-base font-medium text-[#1a1a1a]">Google 行事曆</h2>
              <p className="mt-2 text-xs text-[#8a8580]">
                填入行事曆 ID，在 Google 行事曆「設定」→ 選擇行事曆 →「整合行事曆」中可找到。
              </p>
              <p className="mt-2 text-xs text-[#8a8580]">
                通常為 Gmail 地址（例如 your@gmail.com），或 ...@group.calendar.google.com 格式。
              </p>
              <div className="mt-4">
                <label htmlFor="calendarId" className="block text-xs font-medium text-[#8a8580]">
                  Calendar ID
                </label>
                <input
                  id="calendarId"
                  type="text"
                  value={calendarId}
                  onChange={(e) => setCalendarId(e.target.value)}
                  placeholder="your@gmail.com"
                  className="mt-1 block w-full border border-[#e0ddd8] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] placeholder-[#b0aaa5] focus:border-[#1a1a1a] focus:outline-none"
                  style={{ fontSize: "16px" }}
                />
                {savedCalendarId && (
                  <p className="mt-1 text-xs text-[#b0aaa5]">
                    目前：{savedCalendarId}
                  </p>
                )}
              </div>
            </div>

            {message && (
              <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-500"}`}>
                {message.text}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full border border-[#1a1a1a] bg-[#1a1a1a] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存設定"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
