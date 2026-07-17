"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/hooks/useAuth";

// React Query와 인증 컨텍스트를 클라이언트 경계에서 한 번에 배선한다.
export function Providers({ children }: { children: React.ReactNode }) {
  // 렌더마다 QueryClient가 재생성되지 않도록 최초 1회만 초기화한다.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
