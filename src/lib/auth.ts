export const COOKIE_NAME = "ccat-session";

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z]+$/.test(username);
}
