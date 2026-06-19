import "server-only";
import { Client } from "@/lib/google-sheets";

export interface PublicClient {
  id: string;
  ownerName: string;
  catName: string;
  note: string;
}

export function toPublicClient(client: Client): PublicClient {
  return {
    id: client.id,
    ownerName: client.ownerName,
    catName: client.catName,
    note: client.note,
  };
}
