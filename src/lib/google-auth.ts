import "server-only";
import { google } from "googleapis";
import { cookies } from "next/headers";
import crypto from "crypto";

const GOOGLE_TOKEN_COOKIE = "ccat-google-token";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  // Use SHA-256 to ensure exactly 32 bytes
  return crypto.createHash("sha256").update(key).digest();
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,
  });
}

function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
}

function decrypt(data: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, encrypted] = data.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export async function saveGoogleTokens(tokens: GoogleTokens): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encrypt(JSON.stringify(tokens));
  cookieStore.set(GOOGLE_TOKEN_COOKIE, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(GOOGLE_TOKEN_COOKIE)?.value;
  if (!value) return null;
  try {
    return JSON.parse(decrypt(value)) as GoogleTokens;
  } catch {
    return null;
  }
}

export async function clearGoogleTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getAuthenticatedClient() {
  const tokens = await getGoogleTokens();
  if (!tokens) return null;

  const client = createOAuth2Client();
  client.setCredentials(tokens);

  // Auto-refresh if token is expired or about to expire (within 5 min)
  const now = Date.now();
  if (tokens.expiry_date && tokens.expiry_date - now < 5 * 60 * 1000) {
    if (!tokens.refresh_token) {
      throw new Error("GOOGLE_TOKEN_EXPIRED");
    }
    const { credentials } = await client.refreshAccessToken();
    const updated: GoogleTokens = {
      access_token: credentials.access_token!,
      refresh_token: credentials.refresh_token ?? tokens.refresh_token,
      expiry_date: credentials.expiry_date ?? undefined,
    };
    client.setCredentials(updated);
    await saveGoogleTokens(updated);
  }

  return client;
}
