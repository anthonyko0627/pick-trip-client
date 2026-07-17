import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
} from "@/lib/authCookies";
import { getCurrentUser, refreshAccessToken } from "@/services/authService";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ accessToken: null, user: null });
  }

  try {
    const tokens = await refreshAccessToken({ refreshToken });
    const user = await getCurrentUser(tokens.accessToken);

    const response = NextResponse.json({
      accessToken: tokens.accessToken,
      user,
    });
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      refreshTokenCookieOptions(),
    );
    return response;
  } catch {
    const response = NextResponse.json({ accessToken: null, user: null });
    response.cookies.delete({
      name: REFRESH_TOKEN_COOKIE,
      path: AUTH_COOKIE_PATH,
    });
    return response;
  }
}
