import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_PATH,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
} from "@/lib/authCookies";
import { isSafeNextPath } from "@/lib/authRedirect";
import { loginWithGoogle } from "@/services/authService";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const rawNext = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const next = isSafeNextPath(rawNext) ? rawNext : "/";

  function clearOAuthCookies(response: NextResponse) {
    response.cookies.delete({
      name: OAUTH_STATE_COOKIE,
      path: AUTH_COOKIE_PATH,
    });
    response.cookies.delete({
      name: OAUTH_NEXT_COOKIE,
      path: AUTH_COOKIE_PATH,
    });
    return response;
  }

  function toLoginError() {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return clearOAuthCookies(NextResponse.redirect(url));
  }

  if (error || !code || !state || !cookieState || state !== cookieState) {
    return toLoginError();
  }

  try {
    const { refreshToken } = await loginWithGoogle({
      authorizationCode: code,
    });
    const response = clearOAuthCookies(
      NextResponse.redirect(new URL(next, origin)),
    );
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      refreshTokenCookieOptions(),
    );
    return response;
  } catch {
    return toLoginError();
  }
}
