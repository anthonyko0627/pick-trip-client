import { apiFetch } from "@/services/apiClient";
import type {
  KakaoLoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";

export async function loginWithKakao(
  request: KakaoLoginRequest,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/login/kakao", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function refreshAccessToken(
  request: TokenRefreshRequest,
): Promise<TokenRefreshResponse> {
  return apiFetch<TokenRefreshResponse>("/api/v1/auth/token/refresh", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function logoutUser(accessToken?: string): Promise<void> {
  await apiFetch<void>("/api/v1/auth/logout", {
    method: "DELETE",
    ...(accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {}),
  });
}

export async function getCurrentUser(
  accessToken: string,
): Promise<UserMeResponse> {
  return apiFetch<UserMeResponse>("/api/v1/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
