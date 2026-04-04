"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface Client {
  id: string;
  ownerName: string;
  catName: string;
  address: string;
  note: string;
}

// Generate time slots from 06:00 to 22:00 in 30-min increments
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) {
      slots.push(`${String(h).padStart(2, "0")}:30`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = h + 1;
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${y}/${m}/${d}（${weekdays[date.getDay()]}）`;
}

/** Return all dates from startDate to endDate inclusive as YYYY-MM-DD strings */
function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

interface Props {
  username: string;
}

export default function ScheduleForm({ username }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [time, setTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error" | "partial";
    message: string;
    warnings?: string[];
  } | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients);
      }
    } catch {
      // Silently fail — client list also shows errors
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Ensure endDate >= startDate
  useEffect(() => {
    if (endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const eventTitle = selectedClient
    ? `【照護】${selectedClient.ownerName}-${selectedClient.catName}（${username}）`
    : "";

  const dates = useMemo(
    () => getDateRange(startDate, endDate),
    [startDate, endDate]
  );

  const eventCount = dates.length;

  async function handleSubmit() {
    if (!selectedClient || !startDate || !endDate || !time) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClient.id,
          startDate,
          endDate,
          startTime: time,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === "TOKEN_EXPIRED") {
          setResult({
            type: "error",
            message: "Google 授權已過期，請重新連結帳號",
          });
          setTimeout(() => {
            window.location.href = "/api/auth/google";
          }, 2000);
          return;
        }
        setResult({ type: "error", message: data.error || "排程建立失敗" });
        return;
      }

      const hasWarnings = data.warnings && data.warnings.length > 0;
      setResult({
        type: hasWarnings ? "partial" : "success",
        message: `已建立排程：Google ${data.google} 筆、iCloud ${data.icloud} 筆`,
        warnings: data.warnings,
      });
      setSelectedClientId("");
    } catch {
      setResult({ type: "error", message: "網路錯誤，請稍後再試" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-900">建立排程</h2>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
        {/* 客戶選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            選擇客戶
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={loadingClients}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">
              {loadingClients ? "載入中..." : "— 請選擇客戶 —"}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ownerName} — {c.catName}
              </option>
            ))}
          </select>
        </div>

        {/* 日期區間 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              開始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={getTodayString()}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              結束日期
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* 時段選擇 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            每日時段（1 小時）
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot} ~ {formatEndTime(slot)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 事件預覽 */}
      {selectedClient && startDate && endDate && time && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-blue-800">
            事件預覽
            <span className="ml-2 rounded-full bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-800">
              共 {eventCount} 筆
            </span>
          </h3>
          <div className="space-y-1 text-sm text-blue-900">
            <p>
              <span className="text-blue-600">標題：</span>
              {eventTitle}
            </p>
            <p>
              <span className="text-blue-600">期間：</span>
              {formatDateDisplay(startDate)}
              {startDate !== endDate && (
                <> ~ {formatDateDisplay(endDate)}</>
              )}
            </p>
            <p>
              <span className="text-blue-600">每日時間：</span>
              {time} ~ {formatEndTime(time)}
            </p>
            <p>
              <span className="text-blue-600">地點：</span>
              {selectedClient.address}
            </p>
          </div>

          {/* 展開日期清單 */}
          {eventCount > 1 && eventCount <= 31 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-blue-600 hover:underline">
                展開所有日期
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dates.map((d) => (
                  <span
                    key={d}
                    className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                  >
                    {formatDateDisplay(d)}
                  </span>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* 結果訊息 */}
      {result && (
        <div
          className={`rounded-lg p-3 text-sm ${
            result.type === "success"
              ? "bg-green-50 text-green-700"
              : result.type === "partial"
              ? "bg-yellow-50 text-yellow-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          <p>{result.message}</p>
          {result.warnings?.map((w, i) => (
            <p key={i} className="mt-1 text-xs opacity-80">
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      {/* 送出按鈕 */}
      <button
        onClick={handleSubmit}
        disabled={!selectedClient || !startDate || !endDate || !time || submitting}
        className="w-full rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "建立中..."
          : `送出排程（${eventCount} 筆）`}
      </button>
    </div>
  );
}
