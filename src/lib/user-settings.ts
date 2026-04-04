import "server-only";
import fs from "fs";
import path from "path";

export interface UserSettings {
  sheetId?: string;
}

const SETTINGS_FILE = path.join(process.cwd(), "config", "user-settings.json");

function readAll(): Record<string, UserSettings> {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeAll(settings: Record<string, UserSettings>) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export function getUserSettings(username: string): UserSettings {
  const all = readAll();
  return all[username] || {};
}

export function setUserSettings(username: string, settings: UserSettings) {
  const all = readAll();
  all[username] = { ...all[username], ...settings };
  writeAll(all);
}
