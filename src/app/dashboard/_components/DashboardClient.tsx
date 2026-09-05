"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import type { Content } from "@/types/content";

import { DashboardHero } from "./DashboardHero";
import { ForYouSection } from "./ForYouSection";
import { MyTripsSection } from "./MyTripsSection";
import { type QuickCategory, QuickCategoryRow } from "./QuickCategoryRow";
import { RecentSection } from "./RecentSection";

interface DashboardClientProps {
  recommendedPool: Content[];
}

// 비로그인 직접 접근 가드. 대시보드는 로그인 전용 화면이라 비로그인이면 홈으로 되돌린다.
export function DashboardClient({ recommendedPool }: DashboardClientProps) {
  const { status } = useAuth();
  const router = useRouter();
  const [category, setCategory] = useState<QuickCategory>("ALL");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  if (status === "unauthenticated" || status === "loading") return null;

  return (
    <div className="flex flex-col gap-12">
      <DashboardHero />
      <QuickCategoryRow selected={category} onSelect={setCategory} />
      {/* items-stretch(기본값)로 둬서, 콘텐츠가 적은 쪽(주로 최근에 본)이
          더 긴 쪽(주로 내 여행)과 같은 높이로 늘어난다. */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_330px]">
        <MyTripsSection />
        <RecentSection />
      </div>
      <ForYouSection recommendedPool={recommendedPool} category={category} />
    </div>
  );
}
