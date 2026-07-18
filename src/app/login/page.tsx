import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <main className="mx-auto flex w-full max-w-sm flex-col px-4 py-24">
      <Card>
        <CardHeader className="items-center text-center">
          <p className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
            Welcome
          </p>
          <CardTitle className="text-2xl font-bold tracking-tight">
            로그인
          </CardTitle>
          <CardDescription className="mt-2">
            소셜 계정으로 간편하게 로그인하세요.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                로그인에 실패했습니다. 다시 시도해주세요.
              </AlertDescription>
            </Alert>
          )}

          <Button
            asChild
            size="lg"
            className="mt-5 h-12 w-full bg-[#FEE500] font-semibold text-black/85 hover:bg-[#FEE500]/90"
          >
            <a href={`/auth/kakao/start?next=${encodeURIComponent(next)}`}>
              카카오로 로그인
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full bg-white font-semibold text-black/85"
          >
            <a href={`/auth/google/start?next=${encodeURIComponent(next)}`}>
              구글로 로그인
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
