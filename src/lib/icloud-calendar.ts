import "server-only";
import { createDAVClient, DAVCalendar } from "tsdav";
import { v4 as uuidv4 } from "uuid";

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

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface ICloudEventInput {
  title: string;
  location: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
}

async function getTargetCalendar(
  client: Awaited<ReturnType<typeof createDAVClient>>,
  calendarName: string
): Promise<DAVCalendar> {
  const calendars = await client.fetchCalendars();
  const target = calendars.find(
    (c) => c.displayName === calendarName
  );
  if (!target) {
    throw new Error(
      `找不到名為「${calendarName}」的 iCloud 行事曆`
    );
  }
  return target;
}

export async function createICloudCalendarEvent(
  event: ICloudEventInput
): Promise<string> {
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

  const calendar = await getTargetCalendar(client, calendarName);
  const uid = uuidv4();
  const endTime = addOneHour(event.startTime);

  const icsData = buildICS({
    uid,
    title: event.title,
    location: event.location,
    description: event.description,
    dtStart: toICSDateTime(event.date, event.startTime),
    dtEnd: toICSDateTime(event.date, endTime),
  });

  await client.createCalendarObject({
    calendar,
    filename: `${uid}.ics`,
    iCalString: icsData,
  });

  return uid;
}

export async function createICloudCalendarEvents(
  events: ICloudEventInput[]
): Promise<string[]> {
  if (events.length === 0) return [];

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

  const calendar = await getTargetCalendar(client, calendarName);
  const ids: string[] = [];

  for (const event of events) {
    const uid = uuidv4();
    const endTime = addOneHour(event.startTime);

    const icsData = buildICS({
      uid,
      title: event.title,
      location: event.location,
      description: event.description,
      dtStart: toICSDateTime(event.date, event.startTime),
      dtEnd: toICSDateTime(event.date, endTime),
    });

    await client.createCalendarObject({
      calendar,
      filename: `${uid}.ics`,
      iCalString: icsData,
    });

    ids.push(uid);
  }

  return ids;
}
