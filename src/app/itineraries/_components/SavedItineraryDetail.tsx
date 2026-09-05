"use client";

import { useState } from "react";

import { DayMapPanel } from "@/app/itinerary/_components/DayMapPanel";
import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { ShareButton } from "@/app/itinerary/_components/ShareButton";
import { useItineraryMapData } from "@/hooks/useItineraryMapData";
import type { ItineraryResponse } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";

interface Props {
  data: ItineraryResponse;
  mapData?: ItineraryMapData;
  itineraryId: string;
}

// 저장한 일정 펼친 상세: 왼쪽 일정 타임라인(ItineraryResult, hideMap) + 오른쪽
// sticky 지도(DayMapPanel). 일차 선택 상태는 여기가 소유해서 양쪽에 같이 넘긴다.
export function SavedItineraryDetail({ data, mapData, itineraryId }: Props) {
  const [dayIndex, setDayIndex] = useState(0);
  // 스냅샷이 있으면 라이브 해석을 건너뛴다(ItineraryResult와 같은 규칙).
  const liveMapData = useItineraryMapData(mapData ? [] : data.days);
  const resolved = mapData ?? liveMapData;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <ItineraryResult
          data={data}
          mapData={resolved}
          selectedDayIndex={dayIndex}
          onSelectDay={setDayIndex}
          hideMap
          headerAction={<ShareButton itineraryId={itineraryId} />}
        />
      </div>

      <div className="sticky top-6 flex flex-col gap-2.5">
        <DayMapPanel
          days={data.days}
          mapData={resolved}
          selectedDayIndex={dayIndex}
        />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          이동 시간·거리는 카카오 모빌리티 자동차 길찾기 실제 도로 기준입니다.
          순서를 바꾸면 다시 계산돼요.
        </p>
      </div>
    </div>
  );
}
