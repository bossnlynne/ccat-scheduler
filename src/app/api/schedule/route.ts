import { NextRequest, NextResponse } from "next/server";
import { getUserSettings } from "@/lib/user-settings";
import { getClients } from "@/lib/google-sheets";
import {
  createGoogleCalendarEvents,
  deleteGoogleCalendarEvents,
  CalendarEventInput,
} from "@/lib/google-calendar";
import { createICloudCalendarEvents, ICloudEventInput } from "@/lib/icloud-calendar";
import { getSessionUsername } from "@/lib/auth-server";

/** both = Google + iCloud 同時建立；google = 只寫入 Google 行事曆 */
type ScheduleTarget = "both" | "google";

function isScheduleTarget(value: unknown): value is ScheduleTarget {
  return value === "both" || value === "google";
}

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
  if (!settings.calendarId) {
    return NextResponse.json(
      { error: "尚未設定 Google Calendar ID，請先至設定頁填入" },
      { status: 400 }
    );
  }
  const calendarId = settings.calendarId;

  const body = await request.json();
  const { clientId, startDate, endDate, startTime } = body;
  const target: ScheduleTarget = isScheduleTarget(body.target)
    ? body.target
    : "both";

  if (!clientId || !startDate || !endDate || !startTime) {
    return NextResponse.json(
      { error: "請填寫所有必要欄位" },
      { status: 400 }
    );
  }

  let clients;
  try {
    clients = await getClients(settings.sheetId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `無法讀取客戶資料：${message}` },
      { status: 500 }
    );
  }

  const client = clients.find((c) => c.id === clientId);
  if (!client) {
    return NextResponse.json({ error: "找不到該客戶" }, { status: 404 });
  }
  if (!client.address.trim()) {
    return NextResponse.json(
      { error: "Google Sheet 中缺少該客戶的照顧地址" },
      { status: 400 }
    );
  }

  const dates = getDateRange(startDate, endDate);
  if (dates.length === 0 || dates.length > 60) {
    return NextResponse.json(
      { error: "日期區間無效或超過 60 天" },
      { status: 400 }
    );
  }

  // 只發 Google 時標題不加「照護」前綴與使用者名稱
  const title =
    target === "google"
      ? `${client.ownerName}-${client.catName}`
      : `［照護］${client.ownerName}-${client.catName}（${username}）`;
  const description = `飼主：${client.ownerName}\n貓咪：${client.catName}\n地址：${client.address}`;

  const eventInputs = dates.map((date) => ({
    title,
    location: client.address,
    description,
    date,
    startTime,
  }));

  // Google 先寫入，iCloud 若失敗則整批回滾，不留下半套排程
  let googleIds: string[];
  try {
    googleIds = await createGoogleCalendarEvents(
      eventInputs as CalendarEventInput[],
      calendarId
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    return NextResponse.json(
      { error: `排程建立失敗，未寫入任何行事曆（Google 行事曆：${msg}）` },
      { status: 500 }
    );
  }

  if (target === "google") {
    return NextResponse.json({
      success: true,
      target,
      createdCount: googleIds.length,
      google: googleIds.length,
      icloud: 0,
    });
  }

  let icloudCount = 0;
  try {
    const icloudRefs = await createICloudCalendarEvents(
      eventInputs as ICloudEventInput[]
    );
    icloudCount = icloudRefs.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "未知錯誤";
    const rollback = await deleteGoogleCalendarEvents(googleIds, calendarId);

    // 回滾若有刪不掉的，必須讓使用者知道行事曆上還有殘留，不能謊報已清乾淨
    const rollbackNote =
      rollback.failed.length > 0
        ? `已刪除 Google 行事曆 ${rollback.deleted} 筆，但有 ${rollback.failed.length} 筆刪除失敗，請手動確認`
        : `已回滾 Google 行事曆的 ${rollback.deleted} 筆事件`;

    return NextResponse.json(
      { error: `排程建立失敗，${rollbackNote}（iCloud 行事曆：${msg}）` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    target,
    createdCount: googleIds.length + icloudCount,
    google: googleIds.length,
    icloud: icloudCount,
  });
}
