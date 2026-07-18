"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold text-foreground">
          PickTrip
        </Link>

        {status === "authenticated" && user && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">
                {user.nickname[0]}
              </span>
              <span className="text-sm text-foreground">{user.nickname}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              로그아웃
            </Button>
          </div>
        )}

        {status === "unauthenticated" && (
          <Button asChild size="sm">
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
              로그인
            </Link>
          </Button>
        )}

        {status === "loading" && (
          <div className="h-8 w-20" aria-hidden="true" />
        )}
      </div>
    </header>
  );
}
