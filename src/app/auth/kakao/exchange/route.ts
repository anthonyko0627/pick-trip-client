import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_PATH,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
} from "@/lib/authCookies";
import { isSafeNextPath } from "@/lib/authRedirect";
import { loginWithKakao } from "@/services/authService";

interface ExchangeRequestBody {
  authorizationCode?: string;
  state?: string;
}

function clearOAuthCookies(response: NextResponse) {
  response.cookies.delete({ name: OAUTH_STATE_COOKIE, path: AUTH_COOKIE_PATH });
  response.cookies.delete({ name: OAUTH_NEXT_COOKIE, path: AUTH_COOKIE_PATH });
  return response;
}

export async function POST(request: NextRequest) {
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const rawNext = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const next = isSafeNextPath(rawNext) ? rawNext : "/";

  const { authorizationCode, state }: ExchangeRequestBody = await request
    .json()
    .catch(() => ({}));

  if (!authorizationCode || !state || !cookieState || state !== cookieState) {
    return clearOAuthCookies(
      NextResponse.json({ error: "invalid_request" }, { status: 400 }),
    );
  }

  try {
    const { refreshToken } = await loginWithKakao({ authorizationCode });
    const response = clearOAuthCookies(NextResponse.json({ next }));
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      refreshTokenCookieOptions(),
    );
    return response;
  } catch {
    return clearOAuthCookies(
      NextResponse.json({ error: "login_failed" }, { status: 401 }),
    );
  }
}
