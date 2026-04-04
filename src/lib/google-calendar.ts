import "server-only";
import { google } from "googleapis";
import { getAuthenticatedClient } from "./google-auth";

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

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function createGoogleCalendarEvent(
  event: CalendarEventInput
): Promise<string> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("未連結 Google 帳號");

  const calendar = google.calendar({ version: "v3", auth });

  const endTime = addOneHour(event.startTime);

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      location: event.location,
      description: event.description,
      start: {
        dateTime: toDateTime(event.date, event.startTime),
        timeZone: "Asia/Taipei",
      },
      end: {
        dateTime: toDateTime(event.date, endTime),
        timeZone: "Asia/Taipei",
      },
    },
  });

  return res.data.id!;
}

export async function createGoogleCalendarEvents(
  events: CalendarEventInput[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const event of events) {
    const id = await createGoogleCalendarEvent(event);
    ids.push(id);
  }
  return ids;
}
