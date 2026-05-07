import { NextRequest, NextResponse } from "next/server";
import { getUserSettings } from "@/lib/user-settings";
import { updateClient, deleteClient } from "@/lib/google-sheets";
import { getSessionUsername } from "@/lib/auth-server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const username = await getSessionUsername();
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const settings = await getUserSettings(username);
  if (!settings.sheetId) {
    return NextResponse.json(
      { error: "尚未設定 Google Sheets ID" },
      { status: 400 }
    );
  }

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
    const client = await updateClient(settings.sheetId, {
      id,
      ownerName,
      catName,
      address,
      note: note || "",
    });
    if (!client) {
      return NextResponse.json({ error: "找不到該客戶" }, { status: 404 });
    }
    return NextResponse.json({ client });
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
  const username = await getSessionUsername();
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const settings = await getUserSettings(username);
  if (!settings.sheetId) {
    return NextResponse.json(
      { error: "尚未設定 Google Sheets ID" },
      { status: 400 }
    );
  }

  const { id } = await params;

  try {
    const deleted = await deleteClient(settings.sheetId, id);
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
