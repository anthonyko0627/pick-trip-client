export interface KakaoLoginRequest {
  authorizationCode: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserMeResponse {
  uid: string;
  email: string;
  nickname: string;
  profileImageUrl: string;
  provider: string;
  createdAt: string;
}
