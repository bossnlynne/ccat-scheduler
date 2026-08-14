// Imported by middleware — must stay Edge-compatible.
// Web Crypto only, no Node built-ins (crypto, fs, ...).
import { COOKIE_NAME } from "./auth";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 天後即使簽章正確也視為過期

interface SessionPayload {
  u: string; // username
  iat: number; // issued at (秒)
}

function getSecret(): string {
  // SESSION_SECRET 為主，TOKEN_ENCRYPTION_KEY 為舊部署的相容名稱
  const secret = process.env.SESSION_SECRET || process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("SESSION_SECRET 未設定，無法簽署登入狀態");
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const str = atob(padded);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function sign(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** 產生 `payload.signature` 形式的 cookie 值，內容經 HMAC-SHA256 簽章。 */
export async function createSessionValue(username: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  return `${encoded}.${await sign(encoded)}`;
}

/** 驗證 cookie 簽章與有效期，通過則回傳使用者名稱，否則 null。 */
export async function readSessionValue(
  value: string | undefined | null
): Promise<string | null> {
  if (!value) return null;

  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  let expected: string;
  try {
    expected = await sign(encoded);
  } catch {
    return null;
  }
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded))
    ) as SessionPayload;
    if (typeof payload.u !== "string" || typeof payload.iat !== "number") {
      return null;
    }
    if (Math.floor(Date.now() / 1000) - payload.iat > MAX_AGE_SECONDS) {
      return null;
    }
    return payload.u;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
