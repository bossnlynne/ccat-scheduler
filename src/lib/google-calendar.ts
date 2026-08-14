import "server-only";
import { google } from "googleapis";
import { getServiceAccountCalendarAuth } from "./google-auth";
import { oneHourWindow } from "./event-time";

export interface CalendarEventInput {
  title: string;
  location: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}

function toDateTime(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

export async function createGoogleCalendarEvent(
  event: CalendarEventInput,
  calendarId: string
): Promise<string> {
  const auth = await getServiceAccountCalendarAuth();
  const calendar = google.calendar({ version: "v3", auth });

  const window = oneHourWindow(event.date, event.startTime);

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: {
        dateTime: toDateTime(window.startDate, window.startTime),
        timeZone: "Asia/Taipei",
      },
      end: {
        dateTime: toDateTime(window.endDate, window.endTime),
        timeZone: "Asia/Taipei",
      },
    },
  });

  return res.data.id!;
}

export interface DeleteResult {
  deleted: number;
  failed: string[]; // 刪不掉的 eventId，代表行事曆上仍殘留事件
}

/** 盡力刪除，個別失敗只記錄不中斷 — 用於回滾。 */
export async function deleteGoogleCalendarEvents(
  eventIds: string[],
  calendarId: string
): Promise<DeleteResult> {
  if (eventIds.length === 0) return { deleted: 0, failed: [] };

  const auth = await getServiceAccountCalendarAuth();
  const calendar = google.calendar({ version: "v3", auth });
  const result: DeleteResult = { deleted: 0, failed: [] };

  for (const eventId of eventIds) {
    try {
      await calendar.events.delete({ calendarId, eventId });
      result.deleted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知錯誤";
      console.error(`回滾 Google 事件 ${eventId} 失敗：${msg}`);
      result.failed.push(eventId);
    }
  }

  return result;
}

/**
 * 全有或全無：任一筆失敗就把已建立的事件刪掉再往外拋，
 * 避免使用者重試後行事曆出現重複事件。
 */
export async function createGoogleCalendarEvents(
  events: CalendarEventInput[],
  calendarId: string
): Promise<string[]> {
  const ids: string[] = [];

  for (const event of events) {
    try {
      ids.push(await createGoogleCalendarEvent(event, calendarId));
    } catch (err) {
      await deleteGoogleCalendarEvents(ids, calendarId);
      throw err;
    }
  }

  return ids;
}
