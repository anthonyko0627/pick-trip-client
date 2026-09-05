import type { Metadata } from "next";
import { Suspense } from "react";

import { SITE_URL } from "@/lib/site";

import { CollectionsSection } from "./_components/CollectionsSection";
import { CtaSection } from "./_components/CtaSection";
import { HeroSection } from "./_components/HeroSection";
import { HowItWorksSection } from "./_components/HowItWorksSection";
import { RegionShowcase } from "./_components/RegionShowcase";
import { TryItSection } from "./_components/TryItSection";

// title은 루트 layout의 title.default를 그대로 쓴다. (같은 세그먼트라 template 미적용)
export const metadata: Metadata = {
  description:
    "하동, 영주, 예천의 여행 콘텐츠를 둘러보고 AI가 만든 맞춤 여행 일정을 받아보세요.",
  alternates: { canonical: new URL("/", SITE_URL).toString() },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection />
      <RegionShowcase />
      <Suspense fallback={<TryItSkeleton />}>
        <TryItSection />
      </Suspense>
      <HowItWorksSection />
      <CollectionsSection />
      <CtaSection />
    </main>
  );
}

// TryItSection이 콘텐츠 목록을 받아오는 동안 나머지 홈은 먼저 스트리밍된다.
function TryItSkeleton() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: 고정 개수 스켈레톤
            key={i}
            className="h-[280px] animate-pulse rounded-[22px] border border-border bg-muted"
          />
        ))}
      </div>
    </section>
  );
}
