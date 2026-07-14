import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserMeResponse } from "@/types/auth";
import { AuthProvider, useAuth } from "./useAuth";

const mockUser: UserMeResponse = {
  uid: "uid-1",
  email: "user@example.com",
  nickname: "김여행",
  profileImageUrl: "https://example.com/profile.png",
  provider: "KAKAO",
  createdAt: "2026-01-01T00:00:00Z",
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("useAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("useAuth를 AuthProvider 밖에서 쓰면 에러를 던진다", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth는 AuthProvider 내부에서만 사용할 수 있습니다",
    );
  });

  it("/auth/session이 토큰/유저를 반환하면 authenticated 상태가 된다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ accessToken: "access-1", user: mockUser }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.accessToken).toBe("access-1");
    expect(result.current.user).toEqual(mockUser);
    expect(fetch).toHaveBeenCalledWith(
      "/auth/session",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("/auth/session이 빈 세션을 반환하면 unauthenticated 상태가 된다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ accessToken: null, user: null }),
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("logout 호출 시 Authorization 헤더를 붙여 /auth/logout을 호출하고 상태를 초기화한다", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: "access-1", user: mockUser }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer access-1" },
      }),
    );
    expect(result.current.status).toBe("unauthenticated");
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
