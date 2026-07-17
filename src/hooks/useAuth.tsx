"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";
import { parseApiError } from "@/lib/errors";
import { apiClient } from "@/services/apiClient";
import type { UserMeResponse } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface SessionResponse {
  accessToken: string | null;
  user: UserMeResponse | null;
}

interface AuthContextValue {
  status: AuthStatus;
  accessToken: string | null;
  user: UserMeResponse | null;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
  runAuthed: <T>(fn: (token?: string) => Promise<T>) => Promise<T>;
}

// 세션 쿼리 키를 한곳에서 관리해 refetch/setQueryData와 어긋나지 않게 한다.
const SESSION_QUERY_KEY = ["auth", "session"] as const;

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();

  // 세션은 서버 상태이므로 React Query로 캐싱한다. staleTime을 무한으로 두어
  // 명시적 refresh/logout이 있을 때만 갱신한다.
  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.post<SessionResponse>("/auth/session");
      return data;
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const accessToken = sessionQuery.data?.accessToken ?? null;
  const user = sessionQuery.data?.user ?? null;
  const status: AuthStatus = sessionQuery.isPending
    ? "loading"
    : accessToken
      ? "authenticated"
      : "unauthenticated";

  // 세션을 다시 조회하고 새 accessToken을 반환한다(없으면 null).
  const refresh = async (): Promise<string | null> => {
    const { data } = await sessionQuery.refetch();
    return data?.accessToken ?? null;
  };

  // 로그아웃은 실패해도 로컬 세션을 비우는 best-effort 정책을 유지한다.
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout", null, {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
    },
    onSettled: () => {
      queryClient.setQueryData<SessionResponse>(SESSION_QUERY_KEY, {
        accessToken: null,
        user: null,
      });
    },
  });

  const logout = async (): Promise<void> => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // best-effort: 서버 로그아웃이 실패해도 onSettled에서 로컬 세션을 비운다.
    }
  };

  // 인증이 필요한 호출을 실행하고, AUTH_REQUIRED로 실패하면 세션을 갱신해
  // 새 토큰으로 1회만 재시도한다.
  const runAuthed = async <T,>(
    fn: (token?: string) => Promise<T>,
  ): Promise<T> => {
    try {
      return await fn(accessToken ?? undefined);
    } catch (err) {
      if (parseApiError(err).code !== "AUTH_REQUIRED") {
        throw err;
      }
      const fresh = await refresh();
      if (!fresh) {
        throw err;
      }
      return await fn(fresh);
    }
  };

  // refresh/logout/runAuthed는 매 렌더 새로 만들어지지만 accessToken/status/user가
  // 바뀔 때 value를 재계산하면 최신 상태를 클로저로 참조하므로 이 셋만 의존성에 둔다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: 위 함수들은 최신 상태를 클로저로 캡처한다
  const value = useMemo<AuthContextValue>(
    () => ({ status, accessToken, user, refresh, logout, runAuthed }),
    [status, accessToken, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
