import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { KakaoMapsPreload } from "@/components/layout/KakaoMapsPreload";
import { getContentFetchErrorMessage } from "@/lib/content";
import { parseApiError } from "@/lib/errors";
import { SITE_URL } from "@/lib/site";
import { getContentById } from "@/services/contentService";
import { REGION_LABELS } from "@/types/region";

import { ContentDetailView } from "./_components/ContentDetailView";
import { hasContentCoord } from "./_lib/contentCoord";
import { buildContentJsonLd } from "./_lib/contentJsonLd";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
};

// 진입 경로를 표시하는 ?from= 파라미터가 붙어도 색인은 한 URL로 모은다.
// generateMetadata와 페이지 본문이 같은 상세 데이터를 쓴다. apiClient는 fetch가
// 아니라 axios라 Next.js의 fetch 자동 메모이제이션이 걸리지 않으므로, React
// cache로 요청 단위 메모이제이션을 걸어 같은 요청 안에서 한 번만 호출한다.
const getContent = cache(getContentById);

// TourAPI 개요는 수천 자에 달할 수 있어 meta description 길이로 잘라 쓴다.
const DESCRIPTION_MAX_LENGTH = 120;

function toDescription(summary: string | undefined): string | null {
  const text = summary?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > DESCRIPTION_MAX_LENGTH
    ? `${text.slice(0, DESCRIPTION_MAX_LENGTH)}…`
    : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  let content: Awaited<ReturnType<typeof getContent>>;
  try {
    content = await getContent(id);
  } catch {
    // 상세를 못 불러와도 화면은 안내 문구로 렌더되므로, 메타데이터만 기본값으로 둔다.
    return {
      title: "여행 콘텐츠",
      alternates: {
        canonical: new URL(`/contents/${id}`, SITE_URL).toString(),
      },
    };
  }

  const regionLabel = REGION_LABELS[content.region];
  const description =
    toDescription(content.summary) ??
    `${regionLabel} ${content.name}의 위치, 이용 시간, 주차 정보를 확인하고 여행 일정에 담아보세요.`;

  return {
    title: `${content.name} · ${regionLabel} 여행 콘텐츠`,
    alternates: { canonical: new URL(`/contents/${id}`, SITE_URL).toString() },
    description,
    openGraph: {
      type: "article",
      siteName: "PickTrip",
      locale: "ko_KR",
      url: "./",
      // 콘텐츠 대표 사진이 있으면 공유 미리보기에 그대로 쓰고, 없으면 기본 카드로 돌아간다.
      images: [content.imageUrl ?? "/og-image.png"],
    },
  };
}

export default async function ContentDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { from } = await searchParams;

  let content: Awaited<ReturnType<typeof getContent>>;
  try {
    content = await getContent(id);
  } catch (err) {
    // 백엔드가 "콘텐츠 없음"이라고 명시한 경우(CONTENT_NOT_FOUND)에만 진짜
    // 404로 처리한다. TourAPI 제공자 오류(CONTENT_PROVIDER_FAILED) 등 그 외
    // 오류까지 없는 콘텐츠처럼 보이면 안 되므로 별도 안내로 보여준다.
    if (parseApiError(err).code === "CONTENT_NOT_FOUND") {
      notFound();
    }
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <p className="text-sm text-destructive">
          {getContentFetchErrorMessage(err)}
        </p>
      </main>
    );
  }

  const jsonLd = buildContentJsonLd(content);

  return (
    <>
      {/* 좌표가 있을 때만 상세 화면이 지도를 그린다. ContentDetailView와 같은
          판정(hasContentCoord)을 써서 조건이 어긋나지 않게 한다. 하이드레이션을
          기다리지 않고 HTML 파싱 시점부터 Kakao Maps SDK를 받기 시작하게 한다. */}
      {hasContentCoord(content) && <KakaoMapsPreload />}

      {/* JSON-LD TouristAttraction. TourAPI 원본 텍스트가 그대로 실리지만,
          React가 문자열 children 안의 </script> 시퀀스를 s 로 중화해
          스크립트가 조기 종료되지 않는다. (dangerouslySetInnerHTML은 그
          중화를 건너뛰므로 여기서 쓰면 안 된다.) */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <ContentDetailView
        content={content}
        showBasketAction={from !== "explore"}
        backHref={from === "explore" ? "/explore" : undefined}
        fromParam={from}
      />
    </>
  );
}
