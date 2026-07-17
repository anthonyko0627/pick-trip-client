import { apiClient } from "@/services/apiClient";
import type {
  OAuthExchangeRequest,
  OAuthExchangeResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

// 소셜 로그인 자체는 백엔드 oauth2Login이 처리하므로 여기에 대응 함수가 없다.
// 진입은 /auth/{provider}/start, 토큰 수령은 /auth/callback이 담당한다.

// 백엔드가 매 호출마다 refreshToken도 새로 발급한다(rotation).
// 호출부는 반환된 refreshToken으로 반드시 교체 저장해야 한다.
export async function refreshAccessToken(
  request: TokenRefreshRequest,
): Promise<TokenRefreshResponse> {
  const { data } = await apiClient.post<TokenRefreshResponse>(
    "/api/v1/auth/token/refresh",
    request,
  );
  return data;
}

// 백엔드가 콜백에서 일회용 code만 넘기고 토큰은 서버 측 저장소에 둔다.
// 프론트 서버가 code와 개시 nonce를 함께 보내 토큰으로 교환한다.
// code 재사용/만료·nonce 불일치 시 백엔드가 401을 반환한다.
export async function exchangeOAuthCode(
  request: OAuthExchangeRequest,
): Promise<OAuthExchangeResponse> {
  const { data } = await apiClient.post<OAuthExchangeResponse>(
    "/api/v1/auth/oauth/exchange",
    request,
  );
  return data;
}

export async function logoutUser(accessToken?: string): Promise<void> {
  await apiClient.delete<void>("/api/v1/auth/logout", {
    headers: authHeaders(accessToken),
  });
}

export async function getCurrentUser(
  accessToken: string,
): Promise<UserMeResponse> {
  const { data } = await apiClient.get<UserMeResponse>("/api/v1/users/me", {
    headers: authHeaders(accessToken),
  });
  return data;
}
