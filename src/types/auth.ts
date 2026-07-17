export interface TokenRefreshRequest {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface OAuthExchangeRequest {
  code: string;
  nonce: string;
}

export interface OAuthExchangeResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserMeResponse {
  uid: string;
  // 카카오는 account_email 동의 항목이 없어 email이 내려오지 않는다.
  email: string | null;
  nickname: string;
  profileImageUrl: string;
  provider: string;
  createdAt: string;
}
