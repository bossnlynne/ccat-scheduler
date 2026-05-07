export const COOKIE_NAME = "ccat-session";

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z]+$/.test(username);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
