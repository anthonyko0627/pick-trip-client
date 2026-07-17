import type { Metadata } from "next";

import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { getSharedItinerary } from "@/services/shareService";
import { REGION_LABELS } from "@/types/region";

export const metadata: Metadata = {
  title: "공유된 일정 | Pick Trip",
};

interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id: token } = await params;

  try {
    const data = await getSharedItinerary(token);
    const durationText =
      data.duration === 0
        ? "당일치기"
        : `${data.duration}박 ${data.duration + 1}일`;

    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
          Shared Trip
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {REGION_LABELS[data.region]} · {data.travelDate} · {durationText}
        </p>
        <div className="mt-6">
          <ItineraryResult data={data} />
        </div>
      </main>
    );
  } catch {
    return (
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-destructive">
          유효하지 않거나 만료된 공유 링크입니다.
        </p>
      </main>
    );
  }
}
