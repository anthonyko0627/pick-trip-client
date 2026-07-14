const isProduction = process.env.NODE_ENV === "production";

export const AUTH_COOKIE_PATH = "/auth";
export const REFRESH_TOKEN_COOKIE = "pt_refresh_token";
export const OAUTH_STATE_COOKIE = "pt_oauth_state";
export const OAUTH_NEXT_COOKIE = "pt_oauth_next";

// OAuth 왕복(Kakao 인가 화면 이동 → 콜백) 동안만 유효하면 되는 짧은 TTL.
export function oauthRoundTripCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: AUTH_COOKIE_PATH,
    maxAge: 300,
  };
}

// 백엔드 refreshToken 실제 TTL 확인 전까지의 가정치(30일).
export function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: AUTH_COOKIE_PATH,
    maxAge: 60 * 60 * 24 * 30,
  };
}
