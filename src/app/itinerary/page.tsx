import type { Metadata } from "next";

import { KakaoMapsPreload } from "@/components/layout/KakaoMapsPreload";
import { REGIONS } from "@/types/region";

import { ItineraryClient } from "./_components/ItineraryClient";

// 입력한 조건에 따라 매번 달라지는 개인화 결과라 검색 결과에 노출될 이유가 없다.
export const metadata: Metadata = {
  title: "AI 일정 생성",
  robots: { index: false },
};

interface ItineraryPageProps {
  searchParams: Promise<{
    regions?: string;
    startDate?: string;
    nights?: string;
    companions?: string;
    // 로그인 후 이 화면으로 되돌아왔음을 표시(로그인 전 미리보기에서 넘긴다).
    resume?: string;
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
    resume = "",
  } = await searchParams;

  // 일정 생성은 첫 지역을 조건으로 보낸다. 지역이 없거나 잘못된 링크는 생성
  // 결과(=지도)까지 갈 수 없으므로 SDK를 미리 받지 않는다.
  const [firstRegion] = regions.split(",");
  const canDrawMap = (REGIONS as readonly string[]).includes(firstRegion);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      {/* 생성 결과가 나오면 곧바로 일차 지도를 그린다. 하이드레이션을
          기다리지 않고 HTML 파싱 시점부터 SDK를 받기 시작하게 한다. */}
      {canDrawMap && <KakaoMapsPreload />}
      <ItineraryClient
        regions={regions}
        startDate={startDate}
        nights={nights}
        companions={companions}
        autoResume={resume === "1"}
      />
    </main>
  );
}
