// 로그인 후 이동할 next 경로를 검증한다. `/`로 시작하지 않거나 `//`로
// 시작하는 값(프로토콜 상대 URL)은 다른 도메인으로 보낼 수 있는 open
// redirect이므로 거부한다.
export function isSafeNextPath(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return true;
}

export const OAUTH_PROVIDERS = ["kakao", "google"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const DEFAULT_API_BASE_URL = "http://localhost:8080";

// 백엔드 Spring Security oauth2Login의 진입점. 인가 요청 state가 백엔드
// origin의 쿠키에 저장되고 소셜 콜백도 백엔드가 직접 받으므로, /api rewrites
// 프록시를 태우지 않고 백엔드 origin으로 곧장 전체 이동해야 한다.
// nonce를 쿼리로 실어 백엔드 state에 바인딩하고, 콜백 교환에서 같은 값을
// 다시 확인하게 함으로써 login CSRF(공격자 세션 주입)를 막는다.
export function oauthAuthorizationUrl(
  provider: OAuthProvider,
  nonce: string,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const url = new URL(`${baseUrl}/oauth2/authorization/${provider}`);
  url.searchParams.set("nonce", nonce);
  return url.toString();
}
