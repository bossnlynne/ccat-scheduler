import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { getUserSettings } from "@/lib/user-settings";
import { getClients } from "@/lib/google-sheets";
import {
  createGoogleCalendarEvents,
  CalendarEventInput,
} from "@/lib/google-calendar";
import { createICloudCalendarEvents, ICloudEventInput } from "@/lib/icloud-calendar";

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function POST(request: NextRequest) {
  const username = request.cookies.get(COOKIE_NAME)?.value;
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
  const { clientId, startDate, endDate, startTime } = body;

  if (!clientId || !startDate || !endDate || !startTime) {
    return NextResponse.json(
      { error: "請填寫所有必要欄位" },
      { status: 400 }
    );
  }

  // Look up client
  const clients = await getClients(settings.sheetId);
  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return NextResponse.json({ error: "找不到該客戶" }, { status: 404 });
  }

  const dates = getDateRange(startDate, endDate);
  if (dates.length === 0 || dates.length > 60) {
    return NextResponse.json(
      { error: "日期區間無效或超過 60 天" },
      { status: 400 }
    );
  }

  const title = `【照護】${client.ownerName}-${client.catName}（${username}）`;
  const description = `飼主：${client.ownerName}\n貓咪：${client.catName}\n地址：${client.address}`;

  const eventInputs = dates.map((date) => ({
    title,
    location: client.address,
    description,
    date,
    startTime,
  }));

  const errors: string[] = [];

  // Write to Google Calendar
  let googleCount = 0;
  try {
    const googleIds = await createGoogleCalendarEvents(
      eventInputs as CalendarEventInput[]
    );
    googleCount = googleIds.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    if (msg === "GOOGLE_TOKEN_EXPIRED") {
      return NextResponse.json(
        { error: "Google 授權已過期，請重新連結 Google 帳號", code: "TOKEN_EXPIRED" },
        { status: 401 }
      );
    }
    errors.push(`Google 行事曆：${msg}`);
  }

  // Write to iCloud Calendar
  let icloudCount = 0;
  try {
    const icloudIds = await createICloudCalendarEvents(
      eventInputs as ICloudEventInput[]
    );
    icloudCount = icloudIds.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    errors.push(`iCloud 行事曆：${msg}`);
  }

  if (googleCount === 0 && icloudCount === 0) {
    return NextResponse.json(
      { error: `排程建立失敗：${errors.join("；")}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    createdCount: googleCount,
    google: googleCount,
    icloud: icloudCount,
    warnings: errors.length > 0 ? errors : undefined,
  });
}
