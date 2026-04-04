import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { getUserSettings, setUserSettings } from "@/lib/user-settings";

function getUsername(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

export async function GET(request: NextRequest) {
  const username = getUsername(request);
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const settings = await getUserSettings(username);
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const username = getUsername(request);
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await request.json();
  const { sheetId } = body;

  if (!sheetId || typeof sheetId !== "string") {
    return NextResponse.json(
      { error: "請提供有效的 Google Sheets ID" },
      { status: 400 }
    );
  }

  await setUserSettings(username, { sheetId: sheetId.trim() });
  return NextResponse.json({ success: true });
}
