"use client";

import { useState } from "react";

import { DayMapPanel } from "@/app/itinerary/_components/DayMapPanel";
import { DayTabs } from "@/app/itinerary/_components/DayTabs";
import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { ShareButton } from "@/app/itinerary/_components/ShareButton";
import { useItineraryMapData } from "@/hooks/useItineraryMapData";
import type { ItineraryResponse } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";

// DayTabs의 실제 텍스트/색은 안 보이므로(invisible) 계산 없이 빈 맵으로 충분하다.
const EMPTY_MAP_DAYS_BY_INDEX = new Map<
  number,
  ItineraryMapData["days"][number]
>();

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

      <div>
        {/* 왼쪽 ItineraryResult의 일차 탭 행(min-h-[45px] + mt-4)을 그대로
            미러링하는 투명 스페이서. 이게 없으면 지도가 탭 행 높이만큼 위에서
            시작해 왼쪽 "1일차" 카드보다 먼저 시작해 보인다. */}
        <div aria-hidden="true" className="hidden lg:block">
          <div className="invisible flex min-h-[45px] flex-wrap items-center gap-3">
            <DayTabs
              days={data.days}
              mapDaysByIndex={EMPTY_MAP_DAYS_BY_INDEX}
              selectedIndex={dayIndex}
              onSelect={() => {}}
            />
          </div>
          <div className="h-4" />
        </div>

        <div className="flex flex-col gap-2.5 lg:sticky lg:top-[86px]">
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
    </div>
  );
}
