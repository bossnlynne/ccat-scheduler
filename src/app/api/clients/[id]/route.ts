import { NextRequest, NextResponse } from "next/server";
import { getUserSettings } from "@/lib/user-settings";
import { getClients, updateClientFields, deleteClient } from "@/lib/google-sheets";
import { getSessionUsername } from "@/lib/auth-server";
import { toPublicClient } from "@/lib/client-privacy";

async function requireSheetId(): Promise<
  { sheetId: string } | { error: NextResponse }
> {
  const username = await getSessionUsername();
  if (!username) {
    return { error: NextResponse.json({ error: "未登入" }, { status: 401 }) };
  }

  const settings = await getUserSettings(username);
  if (!settings.sheetId) {
    return {
      error: NextResponse.json(
        { error: "尚未設定 Google Sheets ID" },
        { status: 400 }
      ),
    };
  }

  return { sheetId: settings.sheetId };
}

/**
 * 單筆完整資料（含照顧地址），供編輯表單預先填入。
 * 清單 API 不回傳地址，這裡一次只暴露使用者明確要編輯的那一筆。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSheetId();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const clients = await getClients(auth.sheetId);
    const client = clients.find((c) => c.id === id);
    if (!client) {
      return NextResponse.json({ error: "找不到該客戶" }, { status: 404 });
    }
    return NextResponse.json({ client });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `無法讀取客戶資料：${message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSheetId();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { ownerName, catName, address, note } = body;

  if (!ownerName || !catName || !address) {
    return NextResponse.json(
      { error: "飼主姓名、貓咪名字、照顧地址為必填" },
      { status: 400 }
    );
  }

  try {
    const client = await updateClientFields(auth.sheetId, id, {
      ownerName,
      catName,
      address,
      note: note || "",
    });
    if (!client) {
      return NextResponse.json({ error: "找不到該客戶" }, { status: 404 });
    }
    return NextResponse.json({ client: toPublicClient(client) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `無法更新客戶：${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSheetId();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const deleted = await deleteClient(auth.sheetId, id);
    if (!deleted) {
      return NextResponse.json({ error: "找不到該客戶" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `無法刪除客戶：${message}` },
      { status: 500 }
    );
  }
}
