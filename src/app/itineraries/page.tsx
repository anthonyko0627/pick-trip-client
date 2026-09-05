import type { Metadata } from "next";

import { SavedItinerariesList } from "./_components/SavedItinerariesList";

// 브라우저에 저장된 개인 일정 목록이라 검색 결과에 노출될 이유가 없다.
export const metadata: Metadata = {
  title: "저장한 일정",
  robots: { index: false },
};

export default function ItinerariesPage() {
  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <p className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
        My Trips
      </p>
      <h1 className="text-2xl font-bold tracking-tight">저장한 일정</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        이 브라우저에서 저장한 일정 목록입니다. 다른 기기나 브라우저에서는
        보이지 않습니다.
      </p>
      <div className="mt-6">
        <SavedItinerariesList />
      </div>
    </main>
  );
}
