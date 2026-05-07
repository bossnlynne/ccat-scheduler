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

  const inputClass =
    "mt-1 block w-full border border-[#e0ddd8] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#b0aaa5] focus:border-[#1a1a1a] focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
      <div className="w-full max-w-md bg-white p-6 shadow-lg">
        <h3 className="mb-5 text-base font-medium text-[#1a1a1a]">
          {isEditing ? "編輯客戶" : "新增客戶"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8a8580]">
              飼主姓名
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              autoFocus
              className={inputClass}
              placeholder="例如：陳小明"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8580]">
              貓咪名字
            </label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className={inputClass}
              placeholder="多隻以 / 分隔"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8580]">
              照顧地址
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="完整地址"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8a8580]">
              備註
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="選填"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="border border-[#e0ddd8] px-4 py-2 text-xs text-[#8a8580] transition-colors hover:bg-[#f5f3ef]"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-[#1a1a1a] bg-[#1a1a1a] px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
            >
              {saving ? "儲存中..." : "儲存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
