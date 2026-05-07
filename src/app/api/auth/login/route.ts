import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isValidUsername, isValidPin } from "@/lib/auth";
import { isAllowedUser } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = body.username?.trim();
  const pin = body.pin?.trim();

  if (!username || !isValidUsername(username)) {
    return NextResponse.json(
      { error: "使用者名稱只能包含英文字母" },
      { status: 400 }
    );
  }

  if (!pin || !isValidPin(pin)) {
    return NextResponse.json(
      { error: "PIN 須為 4～6 位數字" },
      { status: 400 }
    );
  }

  try {
    if (!(await isAllowedUser(username, pin))) {
      return NextResponse.json(
        { error: "使用者名稱或 PIN 錯誤" },
        { status: 403 }
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知錯誤";
    console.error("Login check failed:", message);
    return NextResponse.json(
      { error: `無法驗證使用者：${message}` },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(COOKIE_NAME, username.toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
