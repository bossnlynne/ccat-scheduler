import { NextRequest, NextResponse } from "next/server";
import { getUserSettings, setUserSettings } from "@/lib/user-settings";
import { ensureSheetHeaders } from "@/lib/google-sheets";
import { getSessionUsername } from "@/lib/auth-server";

export async function GET() {
  const username = await getSessionUsername();
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const settings = await getUserSettings(username);
  return NextResponse.json({ settings });
}

export async function PUT(request: NextRequest) {
  const username = await getSessionUsername();
  if (!username) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await request.json();
  const { sheetId, calendarId } = body;

  if (sheetId !== undefined) {
    if (!sheetId || typeof sheetId !== "string") {
      return NextResponse.json(
        { error: "請提供有效的 Google Sheets ID" },
        { status: 400 }
      );
    }
    const trimmedId = sheetId.trim();
    await setUserSettings(username, { sheetId: trimmedId });
    await ensureSheetHeaders(trimmedId);
  }

  if (calendarId !== undefined) {
    const trimmedCalId = typeof calendarId === "string" ? calendarId.trim() : "";
    await setUserSettings(username, { calendarId: trimmedCalId || undefined });
  }

  return NextResponse.json({ success: true });
}
