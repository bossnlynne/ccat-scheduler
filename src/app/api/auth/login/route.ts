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

  try {
    if (!(await isAllowedUser(username))) {
      return NextResponse.json(
        { error: "此使用者名稱不在允許名單中" },
        { status: 403 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    console.error("Login whitelist check failed:", message);
    return NextResponse.json(
      { error: `無法驗證使用者：${message}` },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ success: true, username: username.toLowerCase() });

  response.cookies.set(COOKIE_NAME, username.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
