import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cache } from "react";

import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { KakaoMapsPreload } from "@/components/layout/KakaoMapsPreload";
import { Button } from "@/components/ui/button";
import { toLatLng } from "@/lib/geo";
import { fetchKakaoDirections } from "@/lib/kakaoDirections";
import { getContentById } from "@/services/contentService";
import { getSharedItinerary } from "@/services/shareService";
import type { Day } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";
import { REGION_LABELS } from "@/types/region";
import { CopyLinkBox } from "./_components/CopyLinkBox";

// generateMetadata와 페이지 본문이 같은 공유 일정을 쓴다. apiClient는 fetch가
// 아니라 axios라 Next.js의 fetch 자동 메모이제이션이 걸리지 않으므로, React
// cache로 요청 단위 메모이제이션을 걸어 같은 요청 안에서 한 번만 호출한다.
const getShared = cache(getSharedItinerary);

// 공유 페이지는 서버 컴포넌트라 클라이언트 지도 훅을 못 쓴다. 좌표·길찾기를
// 서버에서 미리 풀어 클라이언트 ItineraryMap island 에 props 로 넘긴다.
const resolveShareMapData = cache(
  async (days: Day[]): Promise<ItineraryMapData> => {
    const ids = [
      ...new Set(days.flatMap((d) => d.items.map((it) => it.contentId))),
    ];
    const details = await Promise.all(
      ids.map((id) => getContentById(id).catch(() => null)),
    );
    const coordById = new Map(
      details.map((d, i) => [
        ids[i],
        d ? toLatLng(d.latitude, d.longitude) : null,
      ]),
    );

    const mapDays = await Promise.all(
      days.map(async (d) => {
        const points = d.items.flatMap((it) => {
          const c = coordById.get(it.contentId);
          return c ? [{ ...c, contentId: it.contentId, title: it.title }] : [];
        });
        const route =
          points.length >= 2 ? await fetchKakaoDirections(points) : null;
        return { dayIndex: d.dayIndex, points, route };
      }),
    );

    return { status: "ready", days: mapDays };
  },
);

function formatDurationText(duration: number): string {
  return duration === 0 ? "당일치기" : `${duration}박 ${duration + 1}일`;
}

interface SharePageProps {
  params: Promise<{ id: string }>;
}

// 공유 링크는 링크를 받은 사람만 보는 페이지라 검색 결과에 노출하지 않는다.
// robots.txt로 /share를 막으면 크롤러가 본문을 읽지 못해 이 규칙도 볼 수 없고
// 링크 미리보기 스크래퍼까지 함께 막힐 수 있어, robots 메타태그로 처리한다.
// OG 메타데이터는 그대로 두므로 카카오톡 등의 공유 카드는 유지된다.
const NOINDEX: Metadata["robots"] = { index: false, follow: false };

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { id: token } = await params;

  let data: Awaited<ReturnType<typeof getShared>>;
  try {
    data = await getShared(token);
  } catch {
    // 만료되었거나 잘못된 링크. 페이지 본문과 같은 안내 성격의 메타데이터를 준다.
    return { title: "공유된 일정", robots: NOINDEX };
  }

  const placeCount = data.days.reduce((sum, day) => sum + day.items.length, 0);

  return {
    title: data.title,
    description: `${REGION_LABELS[data.region]} ${formatDurationText(data.duration)} 여행 일정 · ${data.travelDate} 출발 · 여행지 ${placeCount}곳`,
    robots: NOINDEX,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { id: token } = await params;

  try {
    const data = await getShared(token);
    const durationText = formatDurationText(data.duration);
    const placeCount = data.days.reduce(
      (sum, day) => sum + day.items.length,
      0,
    );
    // 좌표/길찾기 조회가 실패해도 공유 페이지 자체는 뜨게 한다.
    const mapData = await resolveShareMapData(data.days).catch(() => undefined);
    // 서버 해석이 실패하면(undefined) ItineraryResult가 클라이언트에서 다시
    // 풀어 지도를 그릴 수 있으므로 SDK가 필요하다. 해석은 됐는데 유효 좌표가
    // 하나도 없으면 DayMapPanel이 아무것도 그리지 않으므로 받지 않는다.
    const drawsMap =
      !mapData || mapData.days.some((day) => day.points.length > 0);

    return (
      <main className="min-h-full bg-[oklch(0.985_0.008_30)]">
        {/* 이 화면은 바로 일차 지도를 그린다. 하이드레이션을 기다리지 않고
            HTML 파싱 시점부터 Kakao Maps SDK를 받기 시작하게 한다. */}
        {drawsMap && <KakaoMapsPreload />}
        <section className="bg-gradient-to-br from-[oklch(0.63_0.2_30)] to-[oklch(0.53_0.2_16)] px-4 py-12 text-white">
          <div className="mx-auto max-w-[900px]">
            <div className="flex items-center gap-2">
              <Image src="/pick-trip-icon.svg" alt="" width={22} height={22} />
              <p className="text-lg font-extrabold tracking-[-0.035em]">
                PickTrip
              </p>
            </div>
            <span className="mt-4 inline-flex items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
              공유된 일정 · 읽기 전용
            </span>
            <h1 className="mt-4 text-[34px] font-extrabold tracking-[-0.04em]">
              {data.title}
            </h1>
            <p className="mt-1.5 text-sm text-white/80">
              {REGION_LABELS[data.region]} · {data.travelDate} · {durationText}{" "}
              · {placeCount}곳
            </p>
            <CopyLinkBox />
          </div>
        </section>

        <div className="mx-auto max-w-[900px] px-4 py-8">
          <ItineraryResult data={data} mapData={mapData} />

          <div className="mt-8 rounded-2xl border border-[oklch(0.91_0.05_30)] bg-white p-6 text-center">
            <p className="text-base font-bold text-foreground">
              나도 이런 일정 만들어볼까요?
            </p>
            <Button asChild className="mt-4">
              <Link href="/">PickTrip 시작하기</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="flex min-h-full items-center justify-center bg-[oklch(0.985_0.008_30)] px-4 py-8">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <p className="text-sm text-destructive">
            유효하지 않거나 만료된 공유 링크입니다.
          </p>
        </div>
      </main>
    );
  }
}
