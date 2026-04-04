import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { createOAuth2Client, saveGoogleTokens } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const username = request.cookies.get(COOKIE_NAME)?.value;
  if (!username) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/?google_error=denied", request.url));
  }

  if (!code || state !== username) {
    return NextResponse.redirect(new URL("/?google_error=invalid", request.url));
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    await saveGoogleTokens({
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    });

    return NextResponse.redirect(new URL("/", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?google_error=exchange", request.url));
  }
}
