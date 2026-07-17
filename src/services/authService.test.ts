import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  OAuthExchangeResponse,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";
import { apiClient } from "./apiClient";
import {
  exchangeOAuthCode,
  getCurrentUser,
  logoutUser,
  refreshAccessToken,
} from "./authService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("refreshAccessToken", () => {
  const mockResponse: TokenRefreshResponse = {
    accessToken: "access-2",
    refreshToken: "refresh-2",
  };

  it("POST /api/v1/auth/token/refresh를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await refreshAccessToken({ refreshToken: "refresh-1" });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/token/refresh", {
      refreshToken: "refresh-1",
    });
    expect(result).toEqual(mockResponse);
  });
});

describe("exchangeOAuthCode", () => {
  const mockResponse: OAuthExchangeResponse = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
  };

  it("POST /api/v1/auth/oauth/exchange를 { code, nonce } body로 호출하고 응답을 그대로 반환", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await exchangeOAuthCode({ code: "code-1", nonce: "n-123" });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/oauth/exchange", {
      code: "code-1",
      nonce: "n-123",
    });
    expect(result).toEqual(mockResponse);
  });
});

describe("logoutUser", () => {
  it("accessToken이 있으면 Authorization 헤더를 붙여 DELETE /api/v1/auth/logout을 호출", async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await logoutUser("access-1");

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/auth/logout", {
      headers: { Authorization: "Bearer access-1" },
    });
  });

  it("accessToken이 없어도 호출은 진행된다(헤더 없이)", async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await logoutUser();

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/auth/logout", {
      headers: undefined,
    });
  });
});

describe("getCurrentUser", () => {
  const mockResponse: UserMeResponse = {
    uid: "uid-1",
    email: "user@example.com",
    nickname: "김여행",
    profileImageUrl: "https://example.com/profile.png",
    provider: "KAKAO",
    createdAt: "2026-01-01T00:00:00Z",
  };

  it("Authorization 헤더를 붙여 GET /api/v1/users/me를 호출하고 응답을 그대로 반환", async () => {
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getCurrentUser("access-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me", {
      headers: { Authorization: "Bearer access-1" },
    });
    expect(result).toEqual(mockResponse);
  });
});
