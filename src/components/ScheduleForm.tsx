"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

interface Client {
  id: string;
  ownerName: string;
  catName: string;
  address: string;
  note: string;
}

// Generate time slots from 06:00 to 23:30 in 30-min increments
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = (h + 1) % 24;
  const nextDay = h + 1 >= 24 ? "+1" : "";
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}${nextDay}`;
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
  displayName: string;
}

export default function ScheduleForm({ displayName }: Props) {
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
      if (res.ok) setClients(data.clients);
    } catch {
      // ignore
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate);
  }, [startDate, endDate]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const eventTitle = selectedClient
    ? `［照護］${selectedClient.ownerName}-${selectedClient.catName}（${displayName}）`
    : "";

  const dates = useMemo(() => getDateRange(startDate, endDate), [startDate, endDate]);
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

  const inputClass =
    "mt-1 block w-full border border-[#e0ddd8] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] focus:border-[#1a1a1a] focus:outline-none";

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-base font-medium text-[#1a1a1a]">建立排程</h2>

      <div className="border border-[#e0ddd8] bg-white p-5 space-y-5 overflow-hidden">
        {/* 客戶選擇 */}
        <div>
          <label className="block text-xs font-medium text-[#8a8580]">選擇客戶</label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={loadingClients}
            className={inputClass}
          >
            <option value="">{loadingClients ? "載入中..." : "-- 請選擇 --"}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.ownerName} / {c.catName}
              </option>
            ))}
          </select>
        </div>

        {/* 日期區間 */}
        <div>
          <label className="block text-xs font-medium text-[#8a8580]">開始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={getTodayString()}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#8a8580]">結束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            className={inputClass}
          />
        </div>

        {/* 時段選擇 */}
        <div>
          <label className="block text-xs font-medium text-[#8a8580]">每日時段（1 小時）</label>
          <select value={time} onChange={(e) => setTime(e.target.value)} className={inputClass}>
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
        <div className="border border-[#e0ddd8] bg-white p-5">
          <p className="text-xs font-medium text-[#8a8580]">
            預覽
            <span className="ml-2 text-[#1a1a1a]">{eventCount} 筆</span>
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-[#1a1a1a]">
            <p>{eventTitle}</p>
            <p className="text-[#8a8580]">
              {formatDateDisplay(startDate)}
              {startDate !== endDate && <> ~ {formatDateDisplay(endDate)}</>}
              {" "}
              {time} ~ {formatEndTime(time)}
            </p>
            <p className="text-xs text-[#b0aaa5]">{selectedClient.address}</p>
          </div>

          {eventCount > 1 && eventCount <= 31 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-[#8a8580] hover:text-[#1a1a1a]">
                展開所有日期
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {dates.map((d) => (
                  <span key={d} className="border border-[#e0ddd8] px-2 py-0.5 text-xs text-[#5a5550]">
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
          className={`border px-4 py-3 text-sm ${
            result.type === "success"
              ? "border-green-200 bg-green-50/60 text-green-700"
              : result.type === "partial"
              ? "border-amber-200 bg-amber-50/60 text-amber-700"
              : "border-red-200 bg-red-50/60 text-red-600"
          }`}
        >
          <p>{result.message}</p>
          {result.warnings?.map((w, i) => (
            <p key={i} className="mt-1 text-xs opacity-75">{w}</p>
          ))}
        </div>
      )}

      {/* 送出按鈕 */}
      <button
        onClick={handleSubmit}
        disabled={!selectedClient || !startDate || !endDate || !time || submitting}
        className="w-full border border-[#1a1a1a] bg-[#1a1a1a] py-3 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-30"
      >
        {submitting ? "建立中..." : `送出排程（${eventCount} 筆）`}
      </button>
    </div>
  );
}
