import "server-only";
import { google } from "googleapis";

function getServiceAccountAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export interface Client {
  id: string;
  ownerName: string;
  catName: string;
  address: string;
  note: string;
}

const HEADER_ROW = ["id", "飼主姓名", "貓咪名字", "照顧地址", "備註"];

export async function ensureSheetHeaders(sheetId: string): Promise<void> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "工作表1!A1:E1",
    });
    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "工作表1!A1:E1",
        valueInputOption: "RAW",
        requestBody: { values: [HEADER_ROW] },
      });
    }
  } catch {
    // Sheet tab may not exist or no access — will surface later when user tries to use it
  }
}

export async function getClients(sheetId: string): Promise<Client[]> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "工作表1!A:E",
  });

  const rows = res.data.values;
  if (!rows || rows.length <= 1) return [];

  return rows.slice(1).filter((row) => row[0]).map((row) => ({
    id: row[0] || "",
    ownerName: row[1] || "",
    catName: row[2] || "",
    address: row[3] || "",
    note: row[4] || "",
  }));
}

export async function addClient(
  sheetId: string,
  client: Omit<Client, "id">
): Promise<Client> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // Ensure header row exists
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "工作表1!A1:E1",
  });
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "工作表1!A1:E1",
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_ROW] },
    });
  }

  const id = crypto.randomUUID().slice(0, 8);
  const row = [id, client.ownerName, client.catName, client.address, client.note];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "工作表1!A:E",
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  return { id, ...client };
}

export async function updateClient(
  sheetId: string,
  client: Client
): Promise<Client | null> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "工作表1!A:E",
  });

  const rows = res.data.values;
  if (!rows) return null;

  const rowIndex = rows.findIndex((row) => row[0] === client.id);
  if (rowIndex === -1) return null;

  const row = [client.id, client.ownerName, client.catName, client.address, client.note];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `工作表1!A${rowIndex + 1}:E${rowIndex + 1}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  return client;
}

export async function deleteClient(
  sheetId: string,
  clientId: string
): Promise<boolean> {
  const auth = getServiceAccountAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "工作表1!A:E",
  });

  const rows = res.data.values;
  if (!rows) return false;

  const rowIndex = rows.findIndex((row) => row[0] === clientId);
  if (rowIndex === -1) return false;

  // Get spreadsheet to find the sheet's ID
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
  });
  const sheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "工作表1"
  );
  const sheetGid = sheet?.properties?.sheetId ?? 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetGid,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return true;
}
