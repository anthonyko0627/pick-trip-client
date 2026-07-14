import { type NextRequest, NextResponse } from "next/server";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  oauthRoundTripCookieOptions,
} from "@/lib/authCookies";
import { isSafeNextPath } from "@/lib/authRedirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const rawNext = searchParams.get("next");
  const next = isSafeNextPath(rawNext) ? rawNext : "/";

  const state = crypto.randomUUID();
  const redirectUri = `${origin}/auth/kakao/callback`;

  const authorizeUrl = new URL("https://kauth.kakao.com/oauth/authorize");
  authorizeUrl.searchParams.set(
    "client_id",
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? "",
  );
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  const cookieOptions = oauthRoundTripCookieOptions();
  response.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(OAUTH_NEXT_COOKIE, next, cookieOptions);

  return response;
}
