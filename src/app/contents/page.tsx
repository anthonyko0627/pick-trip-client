import { getContents } from "@/services/contentService";

import { ContentGrid } from "./_components/ContentGrid";

interface ContentsPageProps {
  searchParams: Promise<{
    regions?: string;
    startDate?: string;
    nights?: string;
    companions?: string;
  }>;
}

export default async function ContentsPage({
  searchParams,
}: ContentsPageProps) {
  const {
    regions = "",
    startDate = "",
    nights = "0",
    companions,
  } = await searchParams;

  let contents: Awaited<ReturnType<typeof getContents>>["contents"] = [];
  let error: string | null = null;

  try {
    const res = await getContents({
      regions: regions ? regions.split(",") : [],
      startDate,
      nights: Number(nights),
      companions: companions ? companions.split(",") : undefined,
    });
    contents = res.contents;
  } catch {
    error = "콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <p className="py-16 text-center text-sm text-destructive">{error}</p>
      </main>
    );
  }

  const itineraryHref = `/itinerary?${new URLSearchParams({
    regions,
    startDate,
    nights,
    ...(companions ? { companions } : {}),
  }).toString()}`;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <ContentGrid initialContents={contents} itineraryHref={itineraryHref} />
    </main>
  );
}
