"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useItineraryMapData } from "@/hooks/useItineraryMapData";
import type { ParsedApiError } from "@/lib/errors";
import { hasEmptyDay } from "@/lib/itinerary";
import type { Content } from "@/types/content";
import type { Day } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";
import type { Region } from "@/types/region";
import { AdjustmentsNotice } from "./AdjustmentsNotice";
import { AlternativePlacePicker } from "./AlternativePlacePicker";
import { DayCard } from "./DayCard";
import { DayMapPanel } from "./DayMapPanel";
import { DayTabs } from "./DayTabs";

interface ItineraryEditor {
  region: Region;
  travelDate: string;
  duration: number;
  days: Day[];
  isDirty: boolean;
  isSaving: boolean;
  saveError: ParsedApiError | null;
  onMoveItem: (dayId: string, itemId: string, direction: "up" | "down") => void;
  onRemoveItem: (dayId: string, itemId: string) => void;
  onTogglePinned: (dayId: string, itemId: string) => void;
  onReplaceItem: (dayId: string, itemId: string, replacement: Content) => void;
  onSave: () => void;
}

interface ItineraryResultProps {
  // adjustments는 generate(미리보기) 응답에만 있다.
  data: { days: Day[]; adjustments?: string[] };
  editor?: ItineraryEditor;
  // "생성된 일정" 제목 옆(일차 탭 행 오른쪽 끝)에 붙는 액션(예: 공유하기 버튼).
  headerAction?: ReactNode;
  // 저장 스냅샷·공유 SSR 처럼 좌표/경로를 이미 해석해둔 경우 그대로 넘긴다.
  // 없으면 내부에서 days 로 라이브 해석한다.
  mapData?: ItineraryMapData;
  // 레이아웃(ItineraryResultLayout) 안에서 쓸 때: 일차 선택 상태를 레이아웃이
  // 소유하고, 지도는 사이드바에서만 그린다. 단독으로 쓸 때는 둘 다 생략 →
  // 내부 useState + DayCard 아래 지도 패널.
  selectedDayIndex?: number;
  onSelectDay?: (index: number) => void;
  hideMap?: boolean;
  // 레이아웃(ItineraryResultLayout)이 조정 안내를 2열 그리드 위 전체 폭으로
  // 직접 렌더할 때 true — 여기서는 중복 렌더를 막는다. 단독 렌더(공유·저장 목록)는
  // false(기본)로 두고 이 컴포넌트가 그린다.
  hideAdjustments?: boolean;
}

export function ItineraryResult({
  data,
  editor,
  headerAction,
  mapData,
  selectedDayIndex,
  onSelectDay,
  hideMap = false,
  hideAdjustments = false,
}: ItineraryResultProps) {
  const [replaceTarget, setReplaceTarget] = useState<{
    dayId: string;
    itemId: string;
  } | null>(null);
  const [internalDayIndex, setInternalDayIndex] = useState(0);

  const days = editor ? editor.days : data.days;
  const adjustments = data.adjustments ?? [];
  const blockedByEmptyDay = editor ? hasEmptyDay(days) : false;

  // mapData 가 오면 라이브 해석은 건너뛴다(빈 배열 → 쿼리 0개).
  const liveMapData = useItineraryMapData(mapData ? [] : days);
  const resolvedMapData = mapData ?? liveMapData;
  const mapDaysByIndex = new Map(
    resolvedMapData.days.map((d) => [d.dayIndex, d]),
  );

  // 실도로 길찾기(route)가 잡힌 날이 하나라도 있으면 이동값 산출 기준을 안내한다.
  const hasAnyRoute = resolvedMapData.days.some((d) => d.route);

  const rawIndex = selectedDayIndex ?? internalDayIndex;
  const selectIndex = onSelectDay ?? setInternalDayIndex;
  const dayIndex =
    days.length === 0 ? 0 : Math.min(Math.max(rawIndex, 0), days.length - 1);
  const selectedDay = days[dayIndex];

  return (
    <section>
      <div className="flex min-h-[45px] flex-wrap items-center justify-between gap-3">
        <DayTabs
          days={days}
          mapDaysByIndex={mapDaysByIndex}
          selectedIndex={dayIndex}
          onSelect={selectIndex}
        />
        {headerAction}
      </div>

      {!hideAdjustments && adjustments.length > 0 && (
        <div className="mt-4">
          <AdjustmentsNotice adjustments={adjustments} />
        </div>
      )}

      {days.length === 0 || !selectedDay ? (
        <p className="mt-4 text-sm text-muted-foreground">
          생성된 일정이 없습니다
        </p>
      ) : (
        <>
          <div className="mt-4">
            <DayCard
              day={selectedDay}
              mapDay={mapDaysByIndex.get(selectedDay.dayIndex)}
              onMoveItem={editor?.onMoveItem}
              onRemoveItem={editor?.onRemoveItem}
              onTogglePinned={editor?.onTogglePinned}
              onOpenReplacePicker={
                editor
                  ? (dayId, itemId) => setReplaceTarget({ dayId, itemId })
                  : undefined
              }
            />
          </div>
          {hasAnyRoute && !hideMap && (
            <p className="mt-3.5 px-0.5 text-[12px] leading-relaxed text-muted-foreground">
              이동 시간·거리는 카카오 모빌리티 자동차 길찾기 실제 도로
              기준입니다. 순서를 바꾸면 다시 계산돼요.
            </p>
          )}
          {!hideMap && (
            <div className="mt-4">
              <DayMapPanel
                days={days}
                mapData={resolvedMapData}
                selectedDayIndex={dayIndex}
              />
            </div>
          )}
        </>
      )}

      {editor && (
        <div className="mt-4 space-y-2">
          {editor.saveError && (
            <p className="text-sm text-destructive">
              {editor.saveError.message}
              {editor.saveError.traceId &&
                ` (참고: ${editor.saveError.traceId})`}
            </p>
          )}
          <Button
            disabled={!editor.isDirty || editor.isSaving || blockedByEmptyDay}
            onClick={editor.onSave}
          >
            {editor.isSaving ? "저장 중..." : "변경사항 저장"}
          </Button>
          {blockedByEmptyDay && (
            <p className="text-sm text-muted-foreground">
              장소가 없는 날이 있어 저장할 수 없어요. 장소를 추가하거나 다시
              생성해보세요.
            </p>
          )}
        </div>
      )}

      {editor && replaceTarget && (
        <AlternativePlacePicker
          region={editor.region}
          travelDate={editor.travelDate}
          duration={editor.duration}
          onSelect={(content) => {
            editor.onReplaceItem(
              replaceTarget.dayId,
              replaceTarget.itemId,
              content,
            );
            setReplaceTarget(null);
          }}
          onClose={() => setReplaceTarget(null)}
        />
      )}
    </section>
  );
}
