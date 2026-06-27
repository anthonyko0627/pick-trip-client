import type { Metadata } from "next";

import { ItineraryClient } from "./_components/ItineraryClient";

export const metadata: Metadata = {
  title: "AI 일정 생성 | Pick Trip",
};

interface ItineraryPageProps {
  searchParams: Promise<{
    regions?: string;
    startDate?: string;
    nights?: string;
    companions?: string;
  }>;
}

export default async function ItineraryPage({
  searchParams,
}: ItineraryPageProps) {
  const {
    regions = "",
    startDate = "",
    nights = "0",
    companions = "",
  } = await searchParams;

  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <ItineraryClient
        regions={regions}
        startDate={startDate}
        nights={nights}
        companions={companions}
      />
    </main>
  );
}
