"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserMeResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/auth/session", { method: "POST" });
      const data: SessionResponse = await response.json();
      if (data.accessToken && data.user) {
        setAccessToken(data.accessToken);
        setUser(data.user);
        setStatus("authenticated");
      } else {
        setAccessToken(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : undefined,
      });
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [accessToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, accessToken, user, refresh, logout }),
    [status, accessToken, user, refresh, logout],
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
