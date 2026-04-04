"use client";

import { useState, FormEvent } from "react";

interface Client {
  id: string;
  ownerName: string;
  catName: string;
  address: string;
  note: string;
}

interface Props {
  client: Client | null;
  onClose: (saved: boolean) => void;
}

export default function ClientModal({ client, onClose }: Props) {
  const isEditing = !!client;
  const [ownerName, setOwnerName] = useState(client?.ownerName || "");
  const [catName, setCatName] = useState(client?.catName || "");
  const [address, setAddress] = useState(client?.address || "");
  const [note, setNote] = useState(client?.note || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!ownerName.trim() || !catName.trim() || !address.trim()) {
      setError("飼主姓名、貓咪名字、照顧地址為必填");
      return;
    }

    setSaving(true);
    try {
      const body = {
        ownerName: ownerName.trim(),
        catName: catName.trim(),
        address: address.trim(),
        note: note.trim(),
      };

      const url = isEditing ? `/api/clients/${client.id}` : "/api/clients";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "儲存失敗");
        return;
      }

      onClose(true);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          {isEditing ? "編輯客戶" : "新增客戶"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              飼主姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoFocus
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="例如：陳小明"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              貓咪名字 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="多隻以 / 分隔，例如：小花/小虎"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              照顧地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="例如：台北市大安區復興南路一段100號"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              備註
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="選填"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
