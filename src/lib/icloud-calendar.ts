import "server-only";
import { createDAVClient, DAVCalendar } from "tsdav";
import { v4 as uuidv4 } from "uuid";
import { oneHourWindow } from "./event-time";

type DAVClientInstance = Awaited<ReturnType<typeof createDAVClient>>;

function getICloudConfig() {
  const appleId = process.env.ICLOUD_APPLE_ID;
  const appPassword = process.env.ICLOUD_APP_PASSWORD;
  const calendarName = process.env.ICLOUD_CALENDAR_NAME;

  if (!appleId || !appPassword || !calendarName) {
    throw new Error("iCloud 行事曆設定不完整，請檢查環境變數");
  }

  return { appleId, appPassword, calendarName };
}

function buildICS(event: {
  uid: string;
  title: string;
  location: string;
  description: string;
  dtStart: string; // 20260610T100000
  dtEnd: string;
}): string {
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CatSitterScheduler//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTART;TZID=Asia/Taipei:${event.dtStart}`,
    `DTEND;TZID=Asia/Taipei:${event.dtEnd}`,
    `SUMMARY:${escape(event.title)}`,
    `LOCATION:${escape(event.location)}`,
    `DESCRIPTION:${escape(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function toICSDateTime(date: string, time: string): string {
  // date: YYYY-MM-DD, time: HH:mm → 20260610T100000
  return date.replace(/-/g, "") + "T" + time.replace(":", "") + "00";
}

export interface ICloudEventInput {
  title: string;
  location: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}

/** 已建立的 iCloud 事件，url 用於回滾刪除。 */
export interface ICloudEventRef {
  uid: string;
  url: string;
}

async function connect(): Promise<{
  client: DAVClientInstance;
  calendar: DAVCalendar;
}> {
  const { appleId, appPassword, calendarName } = getICloudConfig();

  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: {
      username: appleId,
      password: appPassword,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  const calendars = await client.fetchCalendars();
  const calendar = calendars.find((c) => c.displayName === calendarName);
  if (!calendar) {
    throw new Error(`找不到名為「${calendarName}」的 iCloud 行事曆`);
  }

  return { client, calendar };
}

async function putEvent(
  client: DAVClientInstance,
  calendar: DAVCalendar,
  event: ICloudEventInput
): Promise<ICloudEventRef> {
  const uid = uuidv4();
  const window = oneHourWindow(event.date, event.startTime);

  const icsData = buildICS({
    uid,
    title: event.title,
    location: event.location,
    description: event.description,
    dtStart: toICSDateTime(window.startDate, window.startTime),
    dtEnd: toICSDateTime(window.endDate, window.endTime),
  });

  const filename = `${uid}.ics`;
  const res = await client.createCalendarObject({
    calendar,
    filename,
    iCalString: icsData,
  });

  // tsdav 不會對 4xx/5xx 拋錯，必須自己檢查，否則失敗會被當成成功
  if (!res.ok) {
    throw new Error(
      `iCloud 拒絕寫入事件（HTTP ${res.status} ${res.statusText}）`
    );
  }

  const base = calendar.url.endsWith("/") ? calendar.url : `${calendar.url}/`;
  return { uid, url: new URL(filename, base).toString() };
}

/** 盡力刪除，個別失敗只記錄不中斷 — 用於回滾。 */
async function deleteEvents(
  client: DAVClientInstance,
  refs: ICloudEventRef[]
): Promise<void> {
  for (const ref of refs) {
    try {
      await client.deleteCalendarObject({ calendarObject: { url: ref.url } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知錯誤";
      console.error(`回滾 iCloud 事件 ${ref.uid} 失敗：${msg}`);
    }
  }
}

export async function createICloudCalendarEvent(
  event: ICloudEventInput
): Promise<string> {
  const { client, calendar } = await connect();
  const ref = await putEvent(client, calendar, event);
  return ref.uid;
}

/**
 * 全有或全無：任一筆失敗就把已建立的事件刪掉再往外拋，
 * 避免使用者重試後行事曆出現重複事件。
 */
export async function createICloudCalendarEvents(
  events: ICloudEventInput[]
): Promise<ICloudEventRef[]> {
  if (events.length === 0) return [];

  const { client, calendar } = await connect();
  const refs: ICloudEventRef[] = [];

  for (const event of events) {
    try {
      refs.push(await putEvent(client, calendar, event));
    } catch (err) {
      await deleteEvents(client, refs);
      throw err;
    }
  }

  return refs;
}
