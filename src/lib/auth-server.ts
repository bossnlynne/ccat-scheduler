import "server-only";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { COOKIE_NAME } from "./auth";

function getServiceAccountAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

type UserRecord = { username: string; pin: string };

async function getUserRecords(): Promise<UserRecord[]> {
  const sheetId = process.env.ADMIN_SHEET_ID;
  if (!sheetId) throw new Error("ADMIN_SHEET_ID is not set");

  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "users!A:B",
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows
    .slice(1)
    .map((row) => ({
      username: (row[0] || "").toString().trim().toLowerCase(),
      pin: (row[1] || "").toString().trim(),
    }))
    .filter((r) => r.username);
}

export async function isAllowedUser(username: string, pin: string): Promise<boolean> {
  const records = await getUserRecords();
  const record = records.find((r) => r.username === username.toLowerCase());
  if (!record) return false;
  return record.pin === pin;
}

export async function getSessionUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
