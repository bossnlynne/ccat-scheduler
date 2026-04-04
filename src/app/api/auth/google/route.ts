import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { getAuthUrl } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const username = request.cookies.get(COOKIE_NAME)?.value;
  if (!username) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Pass username as state to verify on callback
  const authUrl = getAuthUrl(username);
  return NextResponse.redirect(authUrl);
}
