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
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">載入中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchClients}
          className="text-sm text-blue-600 hover:underline"
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">客戶資料庫</h2>
        <button
          onClick={handleAdd}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + 新增客戶
        </button>
      </div>

      {actionMessage && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            actionMessage.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          尚無客戶資料，請點擊「新增客戶」開始建立
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {client.ownerName}
                    <span className="ml-2 text-gray-500">—</span>
                    <span className="ml-2 text-gray-700">{client.catName}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    {client.address}
                  </p>
                  {client.note && (
                    <p className="mt-1 text-sm text-gray-400">{client.note}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="rounded px-2.5 py-1 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={deletingId === client.id}
                    className="rounded px-2.5 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === client.id ? "刪除中..." : "刪除"}
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
