import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import { ApiError } from "@/lib/errors";
import type { UserMeResponse } from "@/types/auth";
import { AuthProvider, useAuth } from "./useAuth";

// apiClient를 mock해 /auth/session·/auth/logout 응답을 직접 제어한다.
vi.mock("@/services/apiClient", () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from "@/services/apiClient";

// axios 반환 타입(AxiosResponse) 제약을 피하려고 느슨한 Mock으로 캐스팅한다.
const mockPost = apiClient.post as unknown as Mock;

const mockUser: UserMeResponse = {
  uid: "uid-1",
  email: "user@example.com",
  nickname: "김여행",
  profileImageUrl: "https://example.com/profile.png",
  provider: "KAKAO",
  createdAt: "2026-01-01T00:00:00Z",
};

// 각 테스트는 독립된 QueryClient를 쓰고, useAuth가 요구하는 두 Provider를 함께 감싼다.
function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

// apiClient.post는 { data } 형태를 반환하므로 세션 응답을 그 모양으로 감싼다.
function sessionData(body: {
  accessToken: string | null;
  user: UserMeResponse | null;
}) {
  return { data: body };
}

describe("useAuth", () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("useAuth를 AuthProvider 밖에서 쓰면 에러를 던진다", () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth는 AuthProvider 내부에서만 사용할 수 있습니다",
    );
  });

  it("/auth/session이 토큰/유저를 반환하면 authenticated 상태가 된다", async () => {
    mockPost.mockResolvedValueOnce(
      sessionData({ accessToken: "access-1", user: mockUser }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("authenticated"));
    expect(result.current.accessToken).toBe("access-1");
    expect(result.current.user).toEqual(mockUser);
    expect(mockPost).toHaveBeenCalledWith("/auth/session");
  });

  it("/auth/session이 빈 세션을 반환하면 unauthenticated 상태가 된다", async () => {
    mockPost.mockResolvedValueOnce(
      sessionData({ accessToken: null, user: null }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it("refresh는 세션을 다시 조회해 새 accessToken을 반환한다", async () => {
    mockPost
      .mockResolvedValueOnce(
        sessionData({ accessToken: "access-1", user: mockUser }),
      )
      .mockResolvedValueOnce(
        sessionData({ accessToken: "access-2", user: mockUser }),
      );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    let fresh: string | null = null;
    await act(async () => {
      fresh = await result.current.refresh();
    });

    expect(fresh).toBe("access-2");
    await waitFor(() => expect(result.current.accessToken).toBe("access-2"));
  });

  it("runAuthed는 성공 시 현재 accessToken을 fn에 전달한다", async () => {
    mockPost.mockResolvedValueOnce(
      sessionData({ accessToken: "access-1", user: mockUser }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    const fn = vi.fn(async (token?: string) => `ok:${token}`);
    let output = "";
    await act(async () => {
      output = await result.current.runAuthed(fn);
    });

    expect(fn).toHaveBeenCalledWith("access-1");
    expect(output).toBe("ok:access-1");
  });

  it("runAuthed는 AUTH_REQUIRED 실패 시 refresh 후 새 토큰으로 1회 재시도한다", async () => {
    mockPost
      .mockResolvedValueOnce(
        sessionData({ accessToken: "access-1", user: mockUser }),
      )
      .mockResolvedValueOnce(
        sessionData({ accessToken: "access-2", user: mockUser }),
      );

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    const fn = vi
      .fn<(token?: string) => Promise<string>>()
      .mockRejectedValueOnce(
        new ApiError(401, "인증이 필요합니다", "AUTH_REQUIRED"),
      )
      .mockResolvedValueOnce("retried");

    let output = "";
    await act(async () => {
      output = await result.current.runAuthed(fn);
    });

    expect(fn).toHaveBeenNthCalledWith(1, "access-1");
    expect(fn).toHaveBeenNthCalledWith(2, "access-2");
    expect(output).toBe("retried");
  });

  it("runAuthed는 refresh가 null이면 원래 에러를 던진다", async () => {
    mockPost
      .mockResolvedValueOnce(
        sessionData({ accessToken: "access-1", user: mockUser }),
      )
      .mockResolvedValueOnce(sessionData({ accessToken: null, user: null }));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    const authError = new ApiError(401, "인증이 필요합니다", "AUTH_REQUIRED");
    const fn = vi
      .fn<(token?: string) => Promise<string>>()
      .mockRejectedValue(authError);

    await expect(
      act(async () => {
        await result.current.runAuthed(fn);
      }),
    ).rejects.toBe(authError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("logout 호출 시 Authorization 헤더를 붙여 /auth/logout을 호출하고 상태를 초기화한다", async () => {
    mockPost
      .mockResolvedValueOnce(
        sessionData({ accessToken: "access-1", user: mockUser }),
      )
      .mockResolvedValueOnce({ data: { ok: true } });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.status).toBe("authenticated"));

    await act(async () => {
      await result.current.logout();
    });

    expect(mockPost).toHaveBeenCalledWith("/auth/logout", null, {
      headers: { Authorization: "Bearer access-1" },
    });
    await waitFor(() => expect(result.current.status).toBe("unauthenticated"));
    expect(result.current.accessToken).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
