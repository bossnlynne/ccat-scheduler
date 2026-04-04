"use client";

import { useState, useEffect, FormEvent } from "react";

export default function SettingsPage() {
  const [sheetId, setSheetId] = useState("");
  const [savedSheetId, setSavedSheetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (res.ok && data.settings?.sheetId) {
          setSheetId(data.settings.sheetId);
          setSavedSheetId(data.settings.sheetId);
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

    const trimmed = sheetId.trim();
    if (!trimmed) {
      setMessage({ type: "error", text: "請輸入 Google Sheets ID" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "儲存失敗" });
        return;
      }

      setSavedSheetId(trimmed);
      setMessage({ type: "success", text: "設定已儲存" });
    } catch {
      setMessage({ type: "error", text: "網路錯誤，請稍後再試" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-base font-bold text-gray-900 sm:text-lg">🐱 個人設定</h1>
        <a
          href="/"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          返回首頁
        </a>
      </header>

      <main className="flex flex-1 justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              Google Sheets 設定
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              填入你的客戶資料試算表 ID。ID 可從試算表網址中取得：
            </p>
            <p className="mb-4 rounded bg-gray-100 px-3 py-2 text-xs text-gray-600 break-all">
              https://docs.google.com/spreadsheets/d/<span className="font-semibold text-blue-600">這一段就是 ID</span>/edit
            </p>

            {loading ? (
              <p className="text-sm text-gray-500">載入中...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="sheetId"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Google Sheets ID
                  </label>
                  <input
                    id="sheetId"
                    type="text"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="例如：1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {savedSheetId && (
                  <p className="text-xs text-gray-400">
                    目前已設定：{savedSheetId.slice(0, 20)}...
                  </p>
                )}

                {message && (
                  <p
                    className={`text-sm ${
                      message.type === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {message.text}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "儲存中..." : "儲存設定"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
