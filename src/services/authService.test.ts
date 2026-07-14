import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LoginResponse,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";
import * as apiClientModule from "./apiClient";
import {
  getCurrentUser,
  loginWithKakao,
  logoutUser,
  refreshAccessToken,
} from "./authService";

vi.mock("./apiClient");

describe("loginWithKakao", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: LoginResponse = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/auth/login/kakao를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await loginWithKakao({ authorizationCode: "code-1" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/auth/login/kakao",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ authorizationCode: "code-1" }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });
});

describe("refreshAccessToken", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: TokenRefreshResponse = {
    accessToken: "access-2",
    refreshToken: "refresh-2",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/auth/token/refresh를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await refreshAccessToken({ refreshToken: "refresh-1" });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/auth/token/refresh",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "refresh-1" }),
      }),
    );
    expect(result).toEqual(mockResponse);
  });
});

describe("logoutUser", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accessToken이 있으면 Authorization 헤더를 붙여 DELETE /api/v1/auth/logout을 호출", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    await logoutUser("access-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer access-1" },
      }),
    );
  });

  it("accessToken이 없어도 호출은 진행된다(헤더 없이)", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);

    await logoutUser();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/auth/logout",
      expect.objectContaining({ method: "DELETE" }),
    );
    const [, options] = mockApiFetch.mock.calls[0];
    expect(options?.headers).toBeUndefined();
  });
});

describe("getCurrentUser", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: UserMeResponse = {
    uid: "uid-1",
    email: "user@example.com",
    nickname: "김여행",
    profileImageUrl: "https://example.com/profile.png",
    provider: "KAKAO",
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Authorization 헤더를 붙여 GET /api/v1/users/me를 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await getCurrentUser("access-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/users/me",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-1" },
      }),
    );
    expect(result).toEqual(mockResponse);
  });
});
