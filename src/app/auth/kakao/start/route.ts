import { type NextRequest, NextResponse } from "next/server";
import {
  OAUTH_NEXT_COOKIE,
  OAUTH_NONCE_COOKIE,
  oauthRoundTripCookieOptions,
} from "@/lib/authCookies";
import { isSafeNextPath, oauthAuthorizationUrl } from "@/lib/authRedirect";

// 인가 코드 처리는 전부 백엔드 oauth2Login이 맡는다. 프론트는 로그인 후
// 돌아갈 next와 함께, 이 브라우저가 개시한 로그인임을 증명할 nonce를 쿠키에
// 남긴다. 같은 nonce를 인가 URL에 실어 백엔드 state에 바인딩하고, 콜백에서
// 쿠키의 nonce와 대조해 맨링크로 시작한 로그인 CSRF를 막는다.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawNext = searchParams.get("next");
  const next = isSafeNextPath(rawNext) ? rawNext : "/";

  const nonce = crypto.randomUUID();
  const response = NextResponse.redirect(oauthAuthorizationUrl("kakao", nonce));
  response.cookies.set(OAUTH_NEXT_COOKIE, next, oauthRoundTripCookieOptions());
  response.cookies.set(
    OAUTH_NONCE_COOKIE,
    nonce,
    oauthRoundTripCookieOptions(),
  );

  return response;
}
