import type { Metadata } from "next";

import { RegionSelectGrid } from "./_components/RegionSelectGrid";

export const metadata: Metadata = {
  title: "지역 선택 | PickTrip",
};

export default function SelectPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">어디로 떠나볼까요?</h1>
        <p className="mt-2 text-muted-foreground">
          여행할 지역을 1개 이상 선택하세요
        </p>
      </div>
      <RegionSelectGrid />
    </main>
  );
}
