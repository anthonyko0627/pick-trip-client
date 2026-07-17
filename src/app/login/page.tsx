import type { Metadata } from "next";
import { isSafeNextPath } from "@/lib/authRedirect";

export const metadata: Metadata = {
  title: "로그인 | PickTrip",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next: rawNext, error } = await searchParams;
  const next = isSafeNextPath(rawNext) ? rawNext : "/";

  return (
    <main className="mx-auto flex max-w-sm flex-col items-center px-4 py-24 text-center">
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
        Welcome
      </p>
      <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        소셜 계정으로 간편하게 로그인하세요.
      </p>

      {error && (
        <p className="mt-4 w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          로그인에 실패했습니다. 다시 시도해주세요.
        </p>
      )}

      <a
        href={`/auth/kakao/start?next=${encodeURIComponent(next)}`}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-sm font-semibold text-black/85"
      >
        카카오로 로그인
      </a>

      <a
        href={`/auth/google/start?next=${encodeURIComponent(next)}`}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-semibold text-black/85"
      >
        구글로 로그인
      </a>
    </main>
  );
}
