"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BasketLayout } from "@/components/BasketLayout";
import { RecommendedCard } from "@/components/RecommendedCard";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { ALL_REGIONS_QUERY } from "@/types/region";

// RecommendedCard와 크기 비율(썸네일 높이·텍스트 줄 수)을 맞춘 로딩 자리표시자.
// 로딩 전후로 레이아웃이 튀지 않게 한다.
function FavoritesCardSkeleton() {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border"
      aria-hidden="true"
    >
      <div className="h-[140px] animate-pulse bg-muted" />
      <div className="flex flex-col gap-1.5 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-8 w-full animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

// 비로그인 직접 접근 가드. DashboardClient/ForYouClient와 동일한 리다이렉트 패턴이다.
export function FavoritesClient() {
  const { status } = useAuth();
  const router = useRouter();
  const { items, isLoading, isError, refetch } = useFavorites();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "unauthenticated" || status === "loading") return null;

  return (
    <BasketLayout
      generateHref={`/select/conditions?regions=${ALL_REGIONS_QUERY}`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="h-[22px] w-1 rounded-full bg-primary" />
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground">
            찜한 콘텐츠
          </h1>
          {!isLoading && !isError && (
            <span className="rounded-full bg-accent px-3 py-1 text-[12.5px] font-bold text-accent-foreground">
              {items.length}개
            </span>
          )}
        </div>

        {isLoading ? (
          <div
            data-testid="favorites-loading"
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {["a", "b", "c", "d"].map((key) => (
              <FavoritesCardSkeleton key={key} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border border-border bg-[oklch(0.99_0.012_30)] py-[70px] text-center">
            <p className="text-[15px] font-bold text-foreground/80">
              찜한 콘텐츠를 불러오지 못했습니다
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 rounded-xl border border-border px-5.5 py-3 text-[13.5px] font-bold text-foreground transition-colors hover:bg-muted"
            >
              다시 시도
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[22px] border-[1.5px] border-dashed border-[oklch(0.88_0.055_30)] bg-[oklch(0.99_0.012_30)] py-[70px] text-center">
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-accent text-[22px] text-primary">
              ♡
            </span>
            <p className="text-[15px] font-bold text-foreground/80">
              아직 찜한 콘텐츠가 없습니다
            </p>
            <Link
              href="/explore"
              className="mt-1 rounded-xl bg-primary px-5.5 py-3 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              추천 콘텐츠 보러 가기 →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[...items].reverse().map((content) => (
              <RecommendedCard
                key={content.id}
                content={content}
                detailHref={`/contents/${content.id}?from=favorites`}
              />
            ))}
          </div>
        )}
      </div>
    </BasketLayout>
  );
}
