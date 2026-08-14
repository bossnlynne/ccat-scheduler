import "server-only";
import { Client } from "@/lib/google-sheets";

export interface PublicClient {
  id: string;
  ownerName: string;
  catName: string;
  note: string;
}

/**
 * 客戶清單刻意不帶照顧地址，避免一次把所有客戶住址送到瀏覽器。
 * 需要地址時（編輯表單）走 GET /api/clients/[id] 單筆取得。
 */
export function toPublicClient(client: Client): PublicClient {
  return {
    id: client.id,
    ownerName: client.ownerName,
    catName: client.catName,
    note: client.note,
  };
}
