import "server-only";
import { google } from "googleapis";

export interface UserSettings {
  sheetId?: string;
  calendarId?: string;
}

function getServiceAccountAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getAdminSheetId(): string {
  const id = process.env.ADMIN_SHEET_ID;
  if (!id) throw new Error("ADMIN_SHEET_ID is not set");
  return id;
}

// settings tab: username | sheetId | calendarId
// Row 1 is header

export async function getUserSettings(username: string): Promise<UserSettings> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getAdminSheetId(),
      range: "settings!A:C",
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) return {};

    const row = rows.slice(1).find(
      (r) => (r[0] || "").toString().trim().toLowerCase() === username.toLowerCase()
    );

    if (!row) return {};
    return {
      sheetId: row[1]?.toString().trim() || undefined,
      calendarId: row[2]?.toString().trim() || undefined,
    };
  } catch {
    return {};
  }
}

export async function setUserSettings(username: string, settings: Partial<UserSettings>): Promise<void> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = getAdminSheetId();

  // Ensure settings tab exists
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "settings!A1",
    });
  } catch {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "settings" } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "settings!A1:C1",
      valueInputOption: "RAW",
      requestBody: { values: [["username", "sheetId", "calendarId"]] },
    });
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "settings!A:C",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r, i) => i > 0 && (r[0] || "").toString().trim().toLowerCase() === username.toLowerCase()
  );

  const existing = rowIndex >= 0 ? rows[rowIndex] : [];
  const newRow = [
    username.toLowerCase(),
    settings.sheetId ?? existing[1] ?? "",
    settings.calendarId ?? existing[2] ?? "",
  ];

  if (rowIndex >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `settings!A${rowIndex + 1}:C${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "settings!A:C",
      valueInputOption: "RAW",
      requestBody: { values: [newRow] },
    });
  }
}
