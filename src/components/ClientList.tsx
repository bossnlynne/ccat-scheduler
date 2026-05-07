"use client";

import { useState, useEffect, useCallback } from "react";
import ClientModal from "./ClientModal";

interface Client {
  id: string;
  ownerName: string;
  catName: string;
  address: string;
  note: string;
}

export default function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setClients(data.clients);
    } catch {
      setError("無法載入客戶資料");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  function handleAdd() {
    setEditingClient(null);
    setModalOpen(true);
  }

  function handleEdit(client: Client) {
    setEditingClient(client);
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此客戶？")) return;
    setDeletingId(id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setActionMessage({ type: "error", text: data.error || "刪除失敗" });
        return;
      }
      setClients((prev) => prev.filter((c) => c.id !== id));
      setActionMessage({ type: "success", text: "客戶已刪除" });
    } catch {
      setActionMessage({ type: "error", text: "刪除失敗，請稍後再試" });
    } finally {
      setDeletingId(null);
    }
  }

  function handleModalClose(saved: boolean) {
    setModalOpen(false);
    setEditingClient(null);
    if (saved) {
      fetchClients();
      setActionMessage({ type: "success", text: editingClient ? "客戶資料已更新" : "客戶已新增" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[#8a8580]">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={fetchClients} className="text-sm text-[#1a1a1a] underline underline-offset-4">
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-[#1a1a1a]">客戶資料</h2>
        <button
          onClick={handleAdd}
          className="border border-[#1a1a1a] px-4 py-1.5 text-xs font-medium text-[#1a1a1a] transition-colors hover:bg-[#1a1a1a] hover:text-white"
        >
          + 新增
        </button>
      </div>

      {actionMessage && (
        <div
          className={`border px-4 py-2 text-sm ${
            actionMessage.type === "success"
              ? "border-green-200 bg-green-50/60 text-green-700"
              : "border-red-200 bg-red-50/60 text-red-600"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {clients.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#8a8580]">
          尚無客戶資料
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="border border-[#e0ddd8] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#1a1a1a]">
                    {client.ownerName}
                    <span className="mx-2 text-[#e0ddd8]">/</span>
                    <span className="font-normal text-[#5a5550]">{client.catName}</span>
                  </p>
                  <p className="mt-1.5 text-xs text-[#8a8580] break-all">
                    {client.address}
                  </p>
                  {client.note && (
                    <p className="mt-1 text-xs text-[#b0aaa5]">{client.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-3">
                  <button
                    onClick={() => handleEdit(client)}
                    className="text-xs text-[#8a8580] underline-offset-4 hover:underline"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={deletingId === client.id}
                    className="text-xs text-red-400 underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    {deletingId === client.id ? "..." : "刪除"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ClientModal client={editingClient} onClose={handleModalClose} />
      )}
    </div>
  );
}
