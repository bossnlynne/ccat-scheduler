import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidUsername } from "@/lib/auth";
import { isAllowedUser } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = body.username?.trim();

  if (!username || !isValidUsername(username)) {
    return NextResponse.json(
      { error: "使用者名稱只能包含英文字母" },
      { status: 400 }
    );
  }

  if (!(await isAllowedUser(username))) {
    return NextResponse.json(
      { error: "此使用者名稱不在允許名單中" },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ success: true, username: username.toLowerCase() });

  response.cookies.set(COOKIE_NAME, username.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge or expires — session cookie, cleared on browser close
  });

  return response;
}
