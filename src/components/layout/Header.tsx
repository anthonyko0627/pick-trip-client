"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useBasket } from "@/hooks/useBasket";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { ALL_REGIONS_QUERY } from "@/types/region";

const NAV_ITEMS = [
  { href: "/", matchPath: "/", label: "홈" },
  {
    href: "/explore",
    matchPath: "/explore",
    label: "콘텐츠 탐색",
  },
  {
    href: `/select/conditions?regions=${ALL_REGIONS_QUERY}`,
    matchPath: "/select/conditions",
    label: "AI일정",
  },
] as const;

const DASHBOARD_NAV_ITEMS = [
  { href: "/dashboard", matchPath: "/dashboard", label: "대시보드" },
] as const;

function isNavActive(pathname: string, matchPath: string) {
  if (matchPath === "/") return pathname === "/";
  return pathname === matchPath || pathname.startsWith(`${matchPath}/`);
}

// 콘텐츠 탐색(/explore)이나 AI일정 생성 흐름(/select, /itinerary)에서 로그인하면
// 원래 있던 페이지로 되돌리지 않고 대시보드로 보낸다.
const DASHBOARD_REDIRECT_PATH_PREFIXES = ["/explore", "/select", "/itinerary"];

function loginNextPath(pathname: string) {
  const shouldGoToDashboard = DASHBOARD_REDIRECT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return shouldGoToDashboard ? "/dashboard" : pathname;
}

export function Header() {
  const { status, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // 로그인 상태 전용 화면(대시보드 등)에 남아있으면 로그아웃 직후 어색하게
  // 비어 보이거나 재로그인을 유도하게 되므로, 로그아웃하면 홈으로 보낸다.
  async function handleLogout() {
    await logout();
    router.push("/");
  }
  const { items: basketItems } = useBasket();
  const { items: favoriteItems } = useFavorites();
  const navItems =
    status === "authenticated"
      ? [...NAV_ITEMS, ...DASHBOARD_NAV_ITEMS]
      : NAV_ITEMS;

  // 일정 공유 페이지와 로그인 페이지는 헤더 없는 화면이다. 로그인 페이지는
  // 자체적으로 좌측에 브랜드 영역을 갖고 있어 헤더가 중복으로 보인다.
  if (pathname.startsWith("/share/") || pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-40 h-[66px] border-b border-border bg-white/[.93] backdrop-blur-[14px]">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/pick-trip-icon.svg" alt="" width={24} height={24} />
            <span className="text-[20px] font-extrabold tracking-[-0.035em] text-foreground">
              Pick<span className="text-primary">Trip</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.matchPath);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-[13px] py-2 transition-colors",
                    active
                      ? "bg-accent font-bold text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {status === "authenticated" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/basket"
                  aria-label={`바구니 ${basketItems.length}개`}
                  className="flex h-11 w-11 items-center justify-center text-primary transition-colors hover:text-primary/80"
                >
                  {/* 링크는 44x44 히트 영역을 갖되, 개수 뱃지는 커진 링크가
                      아니라 아이콘 모서리에 붙어야 해서 한 겹 더 감싼다. */}
                  <span className="relative flex h-7 w-7 items-center justify-center">
                    <Icon name="bookmark" size={20} />
                    {basketItems.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {basketItems.length}
                      </span>
                    )}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent>장바구니</TooltipContent>
            </Tooltip>
          )}

          {status === "authenticated" && user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex min-h-11 items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm text-foreground outline-none transition-colors hover:border-[oklch(0.82_0.06_30)]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[oklch(0.63_0.2_30)] to-[oklch(0.53_0.2_16)] text-xs font-semibold text-white">
                  {user.nickname[0]}
                </span>
                <span>{user.nickname}</span>
                <Icon
                  name="chevron-down"
                  size={16}
                  className="text-muted-foreground"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/mypage">
                    {/* user 아이콘은 24x24 grid 안에서 실제 그림이 차지하는
                        영역(16x16)이 heart(20x18.35)보다 작아, 같은 size 값을
                        줘도 눈에는 더 작아 보인다. 체감 크기를 맞추려고
                        살짝 키운다. */}
                    <Icon name="user" size={19} />
                    마이페이지
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/favorites">
                    <Icon name="heart" size={16} />
                    찜한 콘텐츠
                    {favoriteItems.length > 0 && (
                      <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {favoriteItems.length}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => handleLogout()}
                >
                  <Icon name="logout" size={16} />
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {status === "unauthenticated" && (
            <Button asChild size="sm">
              <Link
                href={`/login?next=${encodeURIComponent(loginNextPath(pathname))}`}
              >
                로그인
              </Link>
            </Button>
          )}

          {status === "loading" && (
            <div className="h-8 w-20" aria-hidden="true" />
          )}
        </div>
      </div>
    </header>
  );
}
