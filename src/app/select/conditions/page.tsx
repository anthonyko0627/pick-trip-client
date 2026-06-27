import type { Metadata } from "next";

import { TravelDateForm } from "./_components/TravelDateForm";

export const metadata: Metadata = {
  title: "여행 조건 설정 | PickTrip",
};

interface ConditionsPageProps {
  searchParams: Promise<{ regions?: string }>;
}

export default async function ConditionsPage({
  searchParams,
}: ConditionsPageProps) {
  const { regions = "" } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">언제 떠나볼까요?</h1>
        <p className="mt-2 text-muted-foreground">
          여행 날짜와 기간을 선택하세요
        </p>
      </div>
      <TravelDateForm regions={regions} />
    </main>
  );
}
