import "server-only";
import { google } from "googleapis";

export interface UserSettings {
  sheetId?: string;
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

// settings tab format: username | sheetId
// Row 1 is header

export async function getUserSettings(username: string): Promise<UserSettings> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getAdminSheetId(),
      range: "settings!A:B",
    });

    const rows = res.data.values;
    if (!rows || rows.length <= 1) return {};

    const row = rows.slice(1).find(
      (r) => (r[0] || "").toString().trim().toLowerCase() === username.toLowerCase()
    );

    if (!row) return {};
    return { sheetId: row[1]?.toString().trim() || undefined };
  } catch {
    // settings tab might not exist yet
    return {};
  }
}

export async function setUserSettings(username: string, settings: UserSettings): Promise<void> {
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
    // Create the tab
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: "settings" } } }],
      },
    });
    // Add header
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "settings!A1:B1",
      valueInputOption: "RAW",
      requestBody: { values: [["username", "sheetId"]] },
    });
  }

  // Check if user row exists
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "settings!A:B",
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r, i) => i > 0 && (r[0] || "").toString().trim().toLowerCase() === username.toLowerCase()
  );

  if (rowIndex >= 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `settings!A${rowIndex + 1}:B${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [[username.toLowerCase(), settings.sheetId || ""]] },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "settings!A:B",
      valueInputOption: "RAW",
      requestBody: { values: [[username.toLowerCase(), settings.sheetId || ""]] },
    });
  }
}
