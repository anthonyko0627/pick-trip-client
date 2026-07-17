import { type NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_PATH,
  OAUTH_NEXT_COOKIE,
  OAUTH_NONCE_COOKIE,
  REFRESH_TOKEN_COOKIE,
  refreshTokenCookieOptions,
} from "@/lib/authCookies";
import { isSafeNextPath } from "@/lib/authRedirect";
import { exchangeOAuthCode } from "@/services/authService";

// 백엔드 OAuth 콜백이 카카오/구글 공통으로 도착하는 지점.
// 이제 토큰은 더 이상 URL에 실리지 않는다. 백엔드는 `?code=<opaque>` 형태의
// 일회용 인가 code만 넘기고, 프론트 서버가 이 code와 로그인 개시 때 심어둔
// nonce를 백엔드 exchange 엔드포인트로 POST 교환해 토큰을 받는다.
// nonce는 이 브라우저가 로그인을 시작했다는 증명이므로, code나 nonce가 없으면
// (맨링크로 도착한 콜백) 교환하지 않고 로그인 에러로 되돌린다. 교환 자체가
// 실패(재사용/만료/nonce 불일치 → 401)해도 마찬가지로 로그인 에러로 되돌린다.
// 교환 응답의 accessToken은 버리고 refreshToken만 httpOnly 쿠키로 저장하며,
// 이후 /auth/session이 refreshToken으로 accessToken을 새로 발급받는다.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const rawNext = request.cookies.get(OAUTH_NEXT_COOKIE)?.value;
  const nonce = request.cookies.get(OAUTH_NONCE_COOKIE)?.value;
  const next = isSafeNextPath(rawNext) ? rawNext : "/";

  function clearRoundTripCookies(response: NextResponse) {
    response.cookies.delete({
      name: OAUTH_NEXT_COOKIE,
      path: AUTH_COOKIE_PATH,
    });
    response.cookies.delete({
      name: OAUTH_NONCE_COOKIE,
      path: AUTH_COOKIE_PATH,
    });
    return response;
  }

  function redirectToLoginError() {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return clearRoundTripCookies(NextResponse.redirect(url));
  }

  if (!code || !nonce) {
    return redirectToLoginError();
  }

  try {
    const tokens = await exchangeOAuthCode({ code, nonce });
    const response = clearRoundTripCookies(
      NextResponse.redirect(new URL(next, origin)),
    );
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      refreshTokenCookieOptions(),
    );
    return response;
  } catch {
    return redirectToLoginError();
  }
}
