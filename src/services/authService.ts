import axios from "axios";
import { apiFetch, BASE_URL } from "@/services/apiClient";
import type {
  GoogleLoginRequest,
  KakaoLoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";

export async function loginWithKakao(
  request: KakaoLoginRequest,
): Promise<LoginResponse> {
  const response = await axios.post<LoginResponse>(
    `${BASE_URL}/api/v1/auth/login/kakao`,
    request,
  );
  return response.data;
}

// 백엔드에 /api/v1/auth/login/google이 아직 없어(이슈 #40) 인터페이스만 우선 정의.
// 백엔드 준비 후 실제 응답 스키마가 LoginResponse와 다르면 이 함수만 조정한다.
export async function loginWithGoogle(
  request: GoogleLoginRequest,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/login/google", {
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
