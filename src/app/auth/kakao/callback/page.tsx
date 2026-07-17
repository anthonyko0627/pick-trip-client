"use client";

import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={<KakaoCallbackStatus />}>
      <KakaoCallbackContent />
    </Suspense>
  );
}

function KakaoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error || !code || !state) {
      router.replace("/login?error=1");
      return;
    }

    let cancelled = false;

    async function exchange() {
      try {
        const response = await axios.post<{ next: string }>(
          "/auth/kakao/exchange",
          { authorizationCode: code, state },
        );
        if (cancelled) return;
        await refresh();
        router.replace(response.data.next);
      } catch {
        if (cancelled) return;
        setHasError(true);
        router.replace("/login?error=1");
      }
    }

    exchange();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, refresh]);

  return <KakaoCallbackStatus hasError={hasError} />;
}

function KakaoCallbackStatus({ hasError = false }: { hasError?: boolean }) {
  return (
    <main className="mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
      <p className="text-sm text-muted-foreground">
        {hasError ? "로그인에 실패했습니다." : "카카오 로그인 처리 중입니다..."}
      </p>
    </main>
  );
}
