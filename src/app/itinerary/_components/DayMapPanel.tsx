import { Icon } from "@/components/ui/icon";
import { dayTravelLabel } from "@/lib/itinerary";
import type { Day } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";
import { DayRouteLegs } from "./DayRouteLegs";
import { ItineraryMap } from "./ItineraryMap";

interface DayMapPanelProps {
  days: Day[];
  mapData: ItineraryMapData;
  selectedDayIndex: number;
}

// 선택한 일차 하나만 보여주는 고정 지도 + 구간 목록 + 카카오맵 링크.
// 레이아웃 사이드바(sticky)와 단독 렌더(공유 페이지·저장 목록 펼침) 양쪽에서 쓴다.
// 좌표가 있는 장소가 하나도 없으면 아무것도 그리지 않는다.
// 지도는 카드 상단 경계에 붙여(패딩 0) 왼쪽 DayCard 헤더와 시작선을 맞춘다.
// 지도 위 좌상단에 일차·장소 수·이동 요약 배지를 올린다(pointer-events-none으로
// 지도 드래그를 막지 않는다).
export function DayMapPanel({
  days,
  mapData,
  selectedDayIndex,
}: DayMapPanelProps) {
  const day = days[selectedDayIndex];
  const mapDay = day
    ? mapData.days.find((d) => d.dayIndex === day.dayIndex)
    : undefined;

  if (!day || !mapDay || mapDay.points.length === 0) return null;

  const last = mapDay.points[mapDay.points.length - 1];
  const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(
    last.title,
  )},${last.lat},${last.lng}`;
  const travelLabel = dayTravelLabel(day, mapDay);
  // DayMapPanel/day 뷰는 항상 코랄로 그린다(ItineraryMap의 CORAL 상수와 동일).
  // dayIndex별 색으로 바꾸면 AI 일정 생성 결과·공유 페이지의 지도 색까지 함께
  // 바뀌므로 이번 범위에서는 하지 않는다.
  const dayColor = "#F2542D";

  return (
    <section className="overflow-hidden rounded-[20px] border border-border bg-card">
      <div className="relative">
        <ItineraryMap
          variant="day"
          days={[mapDay]}
          heightClassName="h-[300px]"
          bare
        />

        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-2 rounded-[12px] border border-border bg-white/94 px-3 py-2 shadow-[0_6px_18px_-10px_rgba(48,20,12,.5)]">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: dayColor }}
          />
          <span className="text-[12.5px] font-extrabold text-foreground">
            {day.dayIndex}일차
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-border" />
          <span className="text-[12px] text-[oklch(0.45_0.015_30)]">
            {[`${day.items.length}곳`, travelLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        {travelLabel && (
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-muted-foreground">
              {day.dayIndex}일차 구간
            </span>
            <span className="font-extrabold text-foreground">
              {travelLabel}
            </span>
          </div>
        )}

        <DayRouteLegs points={mapDay.points} route={mapDay.route} />

        <a
          href={kakaoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border border-border text-[13px] font-bold text-foreground transition-colors hover:bg-muted"
        >
          <Icon name="external-link" size={14} />
          카카오맵에서 경로 열기
        </a>
      </div>
    </section>
  );
}
