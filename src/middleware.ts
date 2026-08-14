import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { readSessionValue } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const username = await readSessionValue(
    request.cookies.get(COOKIE_NAME)?.value
  );

  if (!username) {
    // API 路徑回 401 JSON，讓前端能讀到錯誤訊息；轉址會讓 res.json() 解析 HTML 失敗
    const response = pathname.startsWith("/api/")
      ? NextResponse.json({ error: "未登入" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));

    // 簽章不符或已過期 — 順手清掉無效 cookie
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
