import { NextResponse } from "next/server";
import { getUserSettings } from "@/lib/user-settings";
import { getClients, addClient } from "@/lib/google-sheets";
import { getSessionUsername } from "@/lib/auth-server";

export async function GET() {
  const username = await getSessionUsername();
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const settings = await getUserSettings(username);
  if (!settings.sheetId) {
    return NextResponse.json(
      { error: "尚未設定 Google Sheets ID，請先至設定頁填入" },
      { status: 400 }
    );
  }

  try {
    const clients = await getClients(settings.sheetId);
    return NextResponse.json({ clients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `無法讀取客戶資料：${message}` },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

  const body = await request.json();
  const { ownerName, catName, address, note } = body;

  if (!ownerName || !catName || !address) {
    return NextResponse.json(
      { error: "飼主姓名、貓咪名字、照顧地址為必填" },
      { status: 400 }
    );
  }

  try {
    const client = await addClient(settings.sheetId, {
      ownerName,
      catName,
      address,
      note: note || "",
    });
    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `無法新增客戶：${message}` },
      { status: 500 }
    );
  }
}
