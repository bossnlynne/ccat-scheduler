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

export async function getAllowedUsers(): Promise<string[]> {
  const sheetId = process.env.ADMIN_SHEET_ID;
  if (!sheetId) throw new Error("ADMIN_SHEET_ID is not set");

  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "users!A:A",
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];

  // Skip header row, normalize to lowercase
  return rows
    .slice(1)
    .map((row) => (row[0] || "").toString().trim().toLowerCase())
    .filter(Boolean);
}

export async function isAllowedUser(username: string): Promise<boolean> {
  const allowed = await getAllowedUsers();
  return allowed.includes(username.toLowerCase());
}

export async function getSessionUsername(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}
