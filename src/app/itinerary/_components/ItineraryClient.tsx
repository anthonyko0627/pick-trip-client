"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/useAuth";
import { useBasket } from "@/hooks/useBasket";
import { useItineraryEditor } from "@/hooks/useItineraryEditor";
import { useItineraryMapData } from "@/hooks/useItineraryMapData";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import { type ParsedApiError, parseApiError } from "@/lib/errors";
import {
  clearDaySchedule,
  formatDistanceKm,
  formatDuration,
  formatTravelMinutes,
  hasEmptyDay,
  sumDayTravel,
  toSaveDays,
} from "@/lib/itinerary";
import { toSnapshot } from "@/lib/itineraryMapSnapshot";
import { JOURNEY_STEPS } from "@/lib/journey";
import {
  addBasketItem,
  getBasket,
  removeBasketItem,
  updateBasketConditions,
} from "@/services/basketService";
import { generateItinerary, saveItinerary } from "@/services/itineraryService";
import { useItineraryMapSnapshotStore } from "@/stores/itineraryMapSnapshotStore";
import type { BasketItem } from "@/types/basket";
import { BASKET_PRIORITY_TO_SERVER } from "@/types/basket";
import type {
  Day,
  ItineraryGenerateRequest,
  ItineraryGenerateResponse,
  ItineraryResponse,
  ItinerarySuggestion,
  ItineraryVariant,
  SaveItineraryRequest,
  TravelMode,
} from "@/types/itinerary";
import { ALL_TRAVEL_MODES } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";
import { REGION_LABELS, type Region } from "@/types/region";
import {
  COMPANION_CONDITION_TO_SERVER,
  type CompanionCondition,
} from "@/types/travel-condition";

import { createLoginPreviewScheduler } from "../_lib/loginPreviewSchedule";
import { AdjustmentsNotice } from "./AdjustmentsNotice";
import { CongestionSuggestions, suggestionKey } from "./CongestionSuggestions";
import { DayMapPanel } from "./DayMapPanel";
import { DayTabs } from "./DayTabs";
import { GeneratingState } from "./GeneratingState";
import { ItineraryResult } from "./ItineraryResult";
import { PreGenerateView } from "./PreGenerateView";
import { ShareButton } from "./ShareButton";
import { TripDistanceCard } from "./TripDistanceCard";
import { TripSummary } from "./TripSummary";
import { VariantSelector } from "./VariantSelector";

// useItineraryMapData 를 조건부로 부를 수 없어(hooks 규칙), 지도 대상이 아닌
// 단계에서 넘길 안정된 빈 배열.
const EMPTY_DAYS: Day[] = [];

// 로그인 왕복(전체 페이지 이동) 동안 리액트 state가 모두 사라지므로, generate
// 시도에 쓴 옵션(mode·startContentId 등)을 잠깐 sessionStorage에 남겨
// autoResume이 같은 조건으로 재생성하게 한다.
const PENDING_GENERATE_OPTIONS_KEY = "pick-trip:pending-generate-options";

// 여행 요약(travelDate·장소 수·이동 합계)을 한 줄로 압축한 결과 헤더 메타.
// CAR는 실도로 route 합계 우선(없으면 백엔드 스케줄러 값 폴백), TRANSIT은
// Kakao route가 자동차 전용이라 항상 백엔드 대중교통 모델 값을 쓴다.
function headerMeta(
  travelDate: string,
  days: Day[],
  mapData: ItineraryMapData,
  travelMode: TravelMode,
): string {
  const [, month, day] = travelDate.split("-");
  const dateText =
    month && day ? `${Number(month)}월 ${Number(day)}일 출발` : null;
  const totalPlaces = days.reduce((sum, d) => sum + d.items.length, 0);

  const routeDays =
    travelMode === "CAR" ? mapData.days.filter((d) => d.route) : [];
  const fallback = sumDayTravel(days);
  const totalMin =
    routeDays.length > 0
      ? routeDays.reduce(
          (s, d) => s + Math.round((d.route?.totalDurationSeconds ?? 0) / 60),
          0,
        )
      : fallback.totalMinutes;
  const totalKm =
    routeDays.length > 0
      ? routeDays.reduce(
          (s, d) => s + (d.route?.totalDistanceMeters ?? 0) / 1000,
          0,
        )
      : fallback.totalKm;
  const travelMin = formatTravelMinutes(totalMin);
  const travelLabel = travelMode === "CAR" ? "차량 이동" : "대중교통 이동";

  return [
    dateText,
    totalPlaces > 0 ? `장소 ${totalPlaces}곳` : null,
    travelMin ? `${travelLabel} ${travelMin}` : null,
    formatDistanceKm(totalKm),
  ]
    .filter(Boolean)
    .join(" · ");
}

// 결과 헤더 + 일차 타임라인(좌) / 고정 지도 + 요약 사이드바(우) 레이아웃 래퍼.
// 일차 선택 상태는 여기서 소유하고, 왼쪽(children)과 오른쪽 사이드바 지도가
// 같은 일차를 보게 한다. children은 (선택 인덱스, 선택 핸들러)를 받는 렌더 함수.
function ItineraryResultLayout({
  region,
  duration,
  travelDate,
  days,
  mapData,
  travelMode = "CAR",
  actions,
  banner,
  children,
  sidebar,
}: {
  region: Region;
  duration: number;
  travelDate: string;
  days: Day[];
  mapData: ItineraryMapData;
  // 선택된 일정안의 이동수단. 저장된 일정 재조회(SavedItineraryPanel)처럼
  // 이동수단을 모르는 경로는 기존과 같은 CAR 기본값을 쓴다(백엔드가 저장
  // 응답에 travelMode를 담지 않는다).
  travelMode?: TravelMode;
  actions: ReactNode;
  // 제목/액션 행과 2열 그리드 사이에 전체 폭으로 렌더하는 안내(조정 내역, 오류,
  // "예시"·"저장됨" 배너 등). 그리드 위에 두어야 왼쪽 타임라인과 오른쪽 지도의
  // 상단선이 어긋나지 않는다.
  banner?: ReactNode;
  children: (
    selectedDayIndex: number,
    onSelectDay: (index: number) => void,
  ) => ReactNode;
  sidebar: ReactNode;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const safeIndex =
    days.length === 0
      ? 0
      : Math.min(Math.max(selectedDayIndex, 0), days.length - 1);
  const meta = headerMeta(travelDate, days, mapData, travelMode);
  const mapDaysByIndex = new Map(mapData.days.map((d) => [d.dayIndex, d]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1 text-xs font-extrabold tracking-widest text-primary uppercase">
            <Icon name="check" size={13} />
            {JOURNEY_STEPS[2].label} 완료
          </p>
          <h1 className="mt-2.5 text-[32px] font-extrabold tracking-tight">
            {REGION_LABELS[region]} {formatDuration(duration)} 일정
          </h1>
          {meta && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">{meta}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>

      {banner && <div className="mt-5 space-y-3">{banner}</div>}

      {/* 오른쪽 칼럼은 self-stretch로 왼쪽 타임라인 높이만큼 늘어나고, sticky는
          그 안쪽 wrapper에 걸어 칼럼 바닥을 넘지 않게 한다. 상단 스페이서는
          왼쪽 pre-card 블록(일차 탭 행 + 카드 mt-4)을 그대로 미러링해, 탭 유무·
          다일/당일 여부와 무관하게 지도 상단이 1일차 카드 상단과 같은 y에서
          시작하게 한다. */}
      <div className="mt-6 grid grid-cols-1 gap-6.5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {children(safeIndex, setSelectedDayIndex)}
        </div>
        <aside className="self-stretch">
          <div aria-hidden="true" className="hidden lg:block">
            <div className="invisible flex min-h-[45px] flex-wrap items-center gap-3">
              <DayTabs
                days={days}
                mapDaysByIndex={mapDaysByIndex}
                selectedIndex={safeIndex}
                onSelect={setSelectedDayIndex}
              />
            </div>
            <div className="h-4" />
          </div>
          <div className="flex flex-col gap-3.5 lg:sticky lg:top-[86px]">
            <DayMapPanel
              days={days}
              mapData={mapData}
              selectedDayIndex={safeIndex}
              travelMode={travelMode}
            />
            {mapData.days.some((d) => d.route) && (
              <p className="px-0.5 text-[12px] leading-relaxed text-muted-foreground">
                {travelMode === "CAR"
                  ? "이동 시간·거리는 카카오 모빌리티 자동차 길찾기 실제 도로 기준입니다. 순서를 바꾸면 다시 계산돼요."
                  : "이동 시간·거리는 도보·대중교통 소요시간 근사치예요(실제 노선·배차는 반영하지 않아요). 지도의 경로선은 참고용 도로 기준이에요."}
              </p>
            )}
            {sidebar}
          </div>
        </aside>
      </div>
    </div>
  );
}

type ItineraryPhase =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "preview";
      data: ItineraryGenerateResponse;
      error?: ParsedApiError;
    }
  | { status: "loginPreview"; data: ItineraryGenerateResponse }
  | { status: "saving"; data: ItineraryGenerateResponse }
  | { status: "saved"; data: ItineraryResponse }
  | { status: "error"; message: string; code?: string; traceId?: string };

// variants가 아예 비어 있을 때(테스트 픽스처 등, generateItinerary는 항상
// 최소 1개를 보장한다) 결과 화면이 크래시하지 않도록 돌려줄 빈 안.
const EMPTY_VARIANT_METRICS = {
  totalTravelMinutes: null,
  totalWalkingMinutes: null,
  totalTransitCost: null,
  placeCount: null,
  unavailableReasons: {},
} as const;

// 사용자가 탭으로 고른 이동수단별 안. 인덱스가 범위를 벗어나면(예: 이전
// 생성에서 골랐던 인덱스가 새 생성의 variants 수보다 큼) 0번째로 되돌린다.
function activeVariantOf(
  data: ItineraryGenerateResponse,
  selectedIndex: number,
): ItineraryVariant {
  if (data.variants.length === 0) {
    return {
      label: "",
      travelMode: "CAR",
      title: data.title,
      days: data.days,
      adjustments: data.adjustments,
      metrics: EMPTY_VARIANT_METRICS,
    };
  }
  const clamped = Math.min(
    Math.max(selectedIndex, 0),
    data.variants.length - 1,
  );
  return data.variants[clamped];
}

// AI가 추가 제안한(addedByAi) 항목 중 사용자가 저장 전에 지운 것들을 걸러낸다.
// dismissed가 비어 있으면(가장 흔한 경우) 원본 배열을 그대로 돌려줘 불필요한
// 리렌더를 피한다. 지운 뒤에는 order를 다시 매겨 번호가 연속되게 하고,
// 그 항목이 걸치던 이동 구간이 사라졌으니 방문 시각·이동 요약도 지운다
// (clearDaySchedule) — 서버가 다시 계산해주지 않는 한 stale 값이 남는다.
function withAiItemsDismissed(days: Day[], dismissed: Set<string>): Day[] {
  if (dismissed.size === 0) return days;
  return days.map((day) => {
    const items = day.items.filter((item) => !dismissed.has(item.itemId));
    if (items.length === day.items.length) return day;
    return clearDaySchedule({
      ...day,
      items: items.map((item, i) => ({ ...item, order: i })),
    });
  });
}

// 혼잡 기반 순서변경 제안(suggestions)은 variants[0] 기준으로 계산돼 최상위에만
// 온다 — 다른 안(탭) 화면에는 적용하지 않는다. 수락한 제안만 실제로 순서를
// 바꾼다: 지정된 일차에서 붐비는 장소(contentId)와 대신 먼저 갈 장소
// (swapWithContentId)의 위치를 맞바꾸고, 순서가 달라졌으니 서버가 계산한
// 방문 시각·이동 요약은 지운다(clearDaySchedule). 서버는 재정렬하지 않으므로
// 이 처리는 전적으로 클라이언트 책임이다.
function applyAcceptedSuggestions(
  days: Day[],
  suggestions: ItinerarySuggestion[],
  acceptedKeys: Set<string>,
): Day[] {
  let result = days;
  for (const suggestion of suggestions) {
    if (!suggestion.swapWithContentId) continue;
    if (!acceptedKeys.has(suggestionKey(suggestion))) continue;
    const swapWithContentId = suggestion.swapWithContentId;
    result = result.map((day) => {
      if (day.dayIndex !== suggestion.dayIndex) return day;
      const busyIndex = day.items.findIndex(
        (item) => item.contentId === suggestion.contentId,
      );
      const swapIndex = day.items.findIndex(
        (item) => item.contentId === swapWithContentId,
      );
      if (busyIndex === -1 || swapIndex === -1) return day;

      const nextItems = [...day.items];
      [nextItems[busyIndex], nextItems[swapIndex]] = [
        nextItems[swapIndex],
        nextItems[busyIndex],
      ];
      return clearDaySchedule({
        ...day,
        items: nextItems.map((item, i) => ({ ...item, order: i })),
      });
    });
  }
  return result;
}

// 로그인 기능이 아직 구현되지 않아 generate가 401 AUTH_REQUIRED를 반환하는 동안,
// 결과 화면 UX를 확인할 수 있도록 바구니 콘텐츠로 로컬 미리보기 데이터를 만든다.
function buildLoginPreviewItinerary(
  items: BasketItem[],
  region: Region,
  startDate: string,
  nights: number,
  dayStartTimes?: (string | null)[],
): ItineraryGenerateResponse {
  const dayCount = nights + 1;
  // 백엔드는 dayIndex를 1부터 채번하므로(DayCard.tsx 참고) 미리보기도 동일하게 맞춘다.
  const days = Array.from({ length: dayCount }, (_, i) => ({
    dayId: `preview-day-${i}`,
    dayIndex: i + 1,
    items: [] as ItineraryGenerateResponse["days"][number]["items"],
  }));

  // 사용자가 시작 시각을 지정했을 때만 그 시각이 반영된 것처럼 가짜 시간대를
  // 붙인다. 지정 안 했으면 null을 주므로 시각 칸은 "·" 자리표시로 남는다.
  const nextTimeRange = createLoginPreviewScheduler(dayStartTimes);

  items.forEach((item, index) => {
    const dayIndex = index % dayCount;
    const day = days[dayIndex];
    const timeRange = nextTimeRange(dayIndex);
    day.items.push({
      itemId: `preview-item-${index}`,
      contentId: item.content.id,
      title: item.content.name,
      order: day.items.length,
      reason: "담아주신 콘텐츠를 기반으로 만든 미리보기 일정입니다.",
      pinned: item.priority === "MUST",
      startTime: timeRange?.startTime,
      endTime: timeRange?.endTime,
    });
  });

  const adjustments: string[] = [];
  return {
    title: "미리보기 일정",
    region,
    travelDate: startDate,
    duration: nights,
    days,
    // 로컬에서 만든 가짜 데이터라 스케줄러 조정 내역이 없다.
    adjustments,
    // 로컬 목데이터라 이동수단별 안을 만들 수 없다 — 자동차 단일안 하나로
    // 맞춰 variants를 쓰는 화면(#135)도 그대로 동작하게 한다.
    variants: [
      {
        label: "자동차 힐링 루트",
        travelMode: "CAR",
        title: "미리보기 일정",
        days,
        adjustments,
        metrics: {
          totalTravelMinutes: null,
          totalWalkingMinutes: null,
          totalTransitCost: null,
          placeCount: null,
          unavailableReasons: {},
        },
      },
    ],
    suggestions: [],
  };
}

function SavedItineraryPanel({ data }: { data: ItineraryResponse }) {
  const editor = useItineraryEditor({
    itineraryId: data.itineraryId,
    title: data.title,
    region: data.region,
    travelDate: data.travelDate,
    duration: data.duration,
    initialDays: data.days,
  });

  const mapData = useItineraryMapData(editor.days);
  const departureTime = editor.days[0]?.items[0]?.startTime ?? null;

  return (
    <ItineraryResultLayout
      region={data.region}
      duration={data.duration}
      travelDate={data.travelDate}
      days={editor.days}
      mapData={mapData}
      actions={
        <>
          <ShareButton
            itineraryId={data.itineraryId}
            linkBoxClassName="w-full sm:w-[28rem]"
          />
          <Button variant="outline" asChild>
            <Link href="/dashboard">대시보드로 가기</Link>
          </Button>
        </>
      }
      banner={
        <p className="text-sm font-semibold text-primary">
          일정이 저장되었습니다.
        </p>
      }
      sidebar={
        <>
          <TripSummary
            regions={[data.region]}
            startDate={data.travelDate}
            nights={data.duration}
            companions={[]}
            items={[]}
            showItemList={false}
            itemCount={editor.days.reduce(
              (sum, day) => sum + day.items.length,
              0,
            )}
            days={editor.days}
            // 편집 중이면 서버가 계산한 이동값이 어긋나므로 숫자 대신 안내를 둔다.
            travelSummary={editor.isDirty ? null : sumDayTravel(editor.days)}
            departureTime={departureTime}
          />
          {editor.isDirty && (
            <p className="px-1 text-[12.5px] text-muted-foreground">
              일정을 바꿔 이동 시간을 다시 계산해야 해요
            </p>
          )}
        </>
      }
    >
      {(selectedDayIndex, onSelectDay) => (
        <>
          <ItineraryResult
            data={data}
            mapData={mapData}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={onSelectDay}
            hideMap
            hideAdjustments
            editor={{
              region: data.region,
              travelDate: data.travelDate,
              duration: data.duration,
              days: editor.days,
              isDirty: editor.isDirty,
              isSaving: editor.isSaving,
              saveError: editor.saveError,
              onMoveItem: editor.moveItem,
              onRemoveItem: editor.removeItem,
              onTogglePinned: editor.togglePinned,
              onReplaceItem: editor.replaceItem,
              onSave: editor.save,
            }}
          />
        </>
      )}
    </ItineraryResultLayout>
  );
}

interface ItineraryClientProps {
  regions: string;
  startDate: string;
  nights: string;
  companions: string;
  // 로그인 후 이 화면으로 되돌아온 경우 true — 바구니가 채워져 있으면 곧바로
  // 진짜 생성을 다시 시도한다.
  autoResume?: boolean;
}

export function ItineraryClient({
  regions,
  startDate,
  nights,
  companions,
  autoResume = false,
}: ItineraryClientProps) {
  const [phase, setPhase] = useState<ItineraryPhase>({ status: "idle" });
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  // 이동수단별 안(variants) 중 사용자가 선택 화면(VariantSelector)에서 고른
  // 인덱스. null이면 아직 안 골랐다는 뜻이다(안이 여러 개일 때만 가능하고,
  // 그동안은 결과 화면을 그리지 않는다). 안이 1개뿐이면 고를 필요가 없어
  // generate 성공 시 곧바로 0으로 채워진다. 예전엔 selectedVariantIndex와
  // variantChosen을 따로 둬서 두 곳에서 손으로 맞춰야 했다(desync 위험) —
  // 단일 state로 합친다.
  const [chosenVariantIndex, setChosenVariantIndex] = useState<number | null>(
    null,
  );
  const variantChosen = chosenVariantIndex !== null;
  const selectedVariantIndex = chosenVariantIndex ?? 0;
  // AI가 추가 제안한 항목 중 저장 전에 지운 것들의 itemId. 새로 생성하면 비운다.
  const [dismissedAiItemIds, setDismissedAiItemIds] = useState<Set<string>>(
    new Set(),
  );
  // 혼잡 기반 순서변경 제안(suggestions) 중 사용자가 수락한 것들의 key
  // (suggestionKey). 새로 생성하면 비운다.
  const [acceptedSuggestionKeys, setAcceptedSuggestionKeys] = useState<
    Set<string>
  >(new Set());
  // 이번 생성 요청에 startContentId로 지정한 장소. 결과 화면에서 "출발"
  // 배지를 표시하는 데만 쓰고, 저장된 일정 재조회 경로에는 없다.
  const [requestedStartContentId, setRequestedStartContentId] = useState<
    string | undefined
  >(undefined);
  const { items, clear: clearBasket, save: saveBasket } = useBasket();
  const { add: addSavedItinerary } = useSavedItineraries();
  const setMapSnapshot = useItineraryMapSnapshotStore((s) => s.set);
  const { runAuthed } = useAuth();

  // 미리보기 단계의 일정으로 지도 데이터(좌표·경로)를 해석한다. 결과 화면에
  // 넘겨 지도를 그리고, 저장 시 그 시점 상태를 스냅샷으로 남긴다. 안을 아직
  // 고르지 않았으면(VariantSelector가 떠 있는 동안) 계산하지 않는다 — 안
  // 선택 전에 기본 0번 안 기준으로 카카오 지도 API를 미리 불렀다가, 사용자가
  // 다른 안을 고르면 그 요청이 그대로 낭비되는 문제가 있었다.
  const previewDays: Day[] =
    variantChosen &&
    (phase.status === "preview" ||
      phase.status === "saving" ||
      phase.status === "loginPreview")
      ? withAiItemsDismissed(
          applyAcceptedSuggestions(
            activeVariantOf(phase.data, selectedVariantIndex).days,
            phase.data.suggestions,
            acceptedSuggestionKeys,
          ),
          dismissedAiItemIds,
        )
      : EMPTY_DAYS;
  const mapData = useItineraryMapData(previewDays);

  // generate 성공/AUTH_REQUIRED로 비운 바구니의 스냅샷. "로그인하고 계속하기"나
  // 선택 화면(VariantSelector) 닫기로 흐름을 이어갈 때만 복원하고, 그냥
  // 페이지를 벗어나면 복원하지 않아 다른 화면에 담아둔 상태가 남지 않는다.
  const basketSnapshotRef = useRef<BasketItem[]>([]);
  const autoResumeTriggered = useRef(false);

  const parsedRegions = regions.split(",").filter(Boolean) as Region[];
  const parsedNights = Number(nights) || 0;
  const parsedCompanions = companions
    .split(",")
    .filter(Boolean) as CompanionCondition[];
  const loginNext = `/itinerary?${new URLSearchParams({ regions, startDate, nights, companions, resume: "1" }).toString()}`;

  // 생성 시퀀스(조건 동기화 → 바구니 반영 → generate)를 runAuthed로 감싸,
  // AUTH_REQUIRED가 나면 내부에서 토큰 재발급 후 1회 재시도한다.
  const generateMutation = useMutation({
    mutationFn: (options: ItineraryGenerateRequest | undefined) =>
      runAuthed(async (token) => {
        // generate는 서버에 저장된 바구니/조건을 읽어 생성하므로, 호출 전에
        // 현재 바구니/조건을 서버에 반영한다. options는 선택 값이라 undefined면
        // 기존과 완전히 같은 요청(자동차 단일안)이 된다.
        await updateBasketConditions(
          {
            region: parsedRegions[0],
            travelDate: startDate,
            duration: parsedNights,
            companions: parsedCompanions.map(
              (c) => COMPANION_CONDITION_TO_SERVER[c],
            ),
          },
          token,
        );

        // 로컬 바구니가 유일한 "진짜" 상태이고, 서버 바구니는 generate 직전에만
        // 로컬과 맞춰주는 일회용 스냅샷이다. addBasketItem만 반복 호출하면
        // 서버 쪽엔 과거 세션에서 추가된 항목이 지워지지 않고 영구히 쌓여서(서버는
        // 삭제 API를 따로 호출해야만 지워짐), 지금 로컬엔 없는 콘텐츠까지
        // generate에 딸려 들어가는 문제가 있었다(예: 예전에 담았다 뺀 콘텐츠가
        // 중복으로 재등장). 그래서 여기서 서버 바구니를 조회해 로컬과 diff를 떠서
        // 로컬에 없는 항목은 지우고, 서버에 없는 항목만 추가한다.
        const serverBasket = await getBasket(token);
        const localContentIds = new Set(items.map((item) => item.content.id));
        const serverContentIds = new Set(
          serverBasket.items.map((item) => item.contentId),
        );

        // 순차로 호출한다 — Promise.all로 병렬화하면 서버 바구니 순서가
        // 로컬 순서와 달라지고(스케줄러의 startContentId 기본값이 바구니
        // 순서를 읽을 수 있음), 중간 항목이 실패해도(BASKET_LIMIT_EXCEEDED
        // 등) 나머지는 이미 요청이 나가버려 부분 상태가 남는다.
        for (const serverItem of serverBasket.items) {
          if (localContentIds.has(serverItem.contentId)) continue;
          await removeBasketItem(serverItem.itemId, token);
        }

        for (const item of items) {
          if (serverContentIds.has(item.content.id)) continue;
          try {
            await addBasketItem(
              {
                contentId: item.content.id,
                priority:
                  BASKET_PRIORITY_TO_SERVER[item.priority ?? "OPTIONAL"],
                title: item.content.name,
                ...(item.content.imageUrl
                  ? { thumbnailUrl: item.content.imageUrl }
                  : {}),
                ...(item.desiredStayMinutes
                  ? { desiredStayMinutes: item.desiredStayMinutes }
                  : {}),
              },
              token,
            );
          } catch (err) {
            const parsed = parseApiError(err);
            if (parsed.code !== "BASKET_ITEM_DUPLICATE") throw err;
          }
        }

        return generateItinerary(options, token);
      }),
  });

  // 저장도 runAuthed로 감싼다. 재발급 후에도 AUTH_REQUIRED면 최종 실패로 취급한다.
  const saveMutation = useMutation({
    mutationFn: (request: SaveItineraryRequest) =>
      runAuthed((token) => saveItinerary(request, token)),
  });

  function handleGenerate(options?: ItineraryGenerateRequest) {
    if (phase.status === "loading") return;

    setPhase({ status: "loading" });
    setRequestedStartContentId(options?.startContentId);

    generateMutation.mutate(options, {
      // 이 시점 바구니 내용은 이미 서버 바구니로 반영돼 AI 생성에 쓰였으니
      // 로컬 바구니(장바구니)는 비운다 — 담아둔 콘텐츠가 생성 후에도 그대로
      // 남아있던 문제를 해결한다.
      onSuccess: (data) => {
        // 스냅샷을 먼저 남겨 안이 여러 개일 때 VariantSelector를 닫아도
        // (선택 없이 취소) 방금 비운 바구니를 되돌릴 수 있게 한다.
        basketSnapshotRef.current = items;
        clearBasket();
        setChosenVariantIndex(data.variants.length <= 1 ? 0 : null);
        setDismissedAiItemIds(new Set());
        setAcceptedSuggestionKeys(new Set());
        setPhase({ status: "preview", data });
      },
      onError: (err) => {
        const { message, code, traceId } = parseApiError(err);
        // runAuthed가 이미 재발급+재시도를 1회 했으므로, 여기 도달한 AUTH_REQUIRED는
        // 재발급까지 실패한 최종 상태다 → 로그인 안내 미리보기로 전환한다.
        if (code === "AUTH_REQUIRED") {
          const data = buildLoginPreviewItinerary(
            items,
            parsedRegions[0],
            startDate,
            parsedNights,
            options?.dayStartTimes,
          );
          // 로그인 이후 흐름과 동일하게 로컬 바구니를 비운다. 스냅샷은 ref에
          // 남겨 로그인/다시 생성으로 흐름을 이어갈 때만 복원한다.
          basketSnapshotRef.current = items;
          // 로그인 왕복은 전체 페이지 이동이라 이 컴포넌트의 state가 모두
          // 사라진다 — 이번 시도에 쓴 옵션(mode·startContentId 등)을
          // sessionStorage에 남겨 로그인 후 autoResume이 같은 조건으로
          // 재생성하게 한다. 저장이 막힌 환경(프라이빗 모드 등)이면 그냥
          // 기본 옵션으로 재생성된다.
          try {
            sessionStorage.setItem(
              PENDING_GENERATE_OPTIONS_KEY,
              JSON.stringify(options ?? {}),
            );
          } catch {
            // 저장 실패는 무시 — autoResume이 기본 옵션으로 대체한다.
          }
          clearBasket();
          setChosenVariantIndex(data.variants.length <= 1 ? 0 : null);
          setDismissedAiItemIds(new Set());
          setAcceptedSuggestionKeys(new Set());
          setPhase({ status: "loginPreview", data });
          return;
        }
        setPhase({ status: "error", message, code, traceId });
      },
    });
  }

  // 로그인 후 이 화면으로 되돌아온 경우(autoResume) 바구니에 항목이 복원돼
  // 있으면 곧바로 진짜 생성을 다시 시도한다. 마운트 후 한 번만. PreGenerateView를
  // 거치지 않는 경로라, 로그인 전 시도에 쓴 옵션을 sessionStorage에서 되살려
  // 넘긴다 — 못 찾으면(직접 URL 진입 등) 그쪽과 같은 기본값(전체 이동수단)으로
  // 대체한다. 이걸 빼먹으면 서버가 CAR 단일 안으로 되돌아가 카드 선택 화면이
  // 뜨지 않거나, 로그인 전에 고른 구성 방식·시작 장소가 조용히 사라진다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: handleGenerate는 매 렌더 재생성되지만 실행 시점 최신 상태를 클로저로 캡처한다
  useEffect(() => {
    if (!autoResume || autoResumeTriggered.current) return;
    if (phase.status !== "idle") return;
    if (items.length < 2) return;
    autoResumeTriggered.current = true;

    let options: ItineraryGenerateRequest = { travelModes: ALL_TRAVEL_MODES };
    try {
      const stored = sessionStorage.getItem(PENDING_GENERATE_OPTIONS_KEY);
      if (stored) options = JSON.parse(stored) as ItineraryGenerateRequest;
      sessionStorage.removeItem(PENDING_GENERATE_OPTIONS_KEY);
    } catch {
      // 접근/파싱 실패는 기본 옵션으로 대체한다.
    }
    handleGenerate(options);
  }, [autoResume, phase.status, items.length]);

  // 선택 화면(VariantSelector)에서 안을 하나 확정한다. 이후 결과 화면은
  // 이 안의 days/adjustments만 보여준다.
  function handleSelectVariant(index: number) {
    setChosenVariantIndex(index);
  }

  // VariantSelector를 닫고 조건을 다시 만지러 간다. generate 성공 시 이미
  // 비운 바구니를 되돌리지 않으면 PreGenerateView가 콘텐츠 0개로 뜨고
  // 생성 버튼이 막혀(2개 이상 필요) 다시 시도할 방법이 없다. useCallback으로
  // 참조를 고정해 VariantSelector의 Escape 키 리스너가 렌더마다 해제·재등록되지
  // 않게 한다(saveBasket은 zustand 액션이라 참조가 이미 안정적이다).
  const handleCancelVariantSelection = useCallback(() => {
    saveBasket(basketSnapshotRef.current);
    setPhase({ status: "idle" });
  }, [saveBasket]);

  // AI 추천 배지를 눌러 저장 전에 그 항목만 지운다(일반 삭제와 달리 확인 단계 없음).
  function handleDismissAiSuggestion(_dayId: string, itemId: string) {
    setDismissedAiItemIds((prev) => new Set(prev).add(itemId));
  }

  // 혼잡 기반 순서변경 제안을 수락한다 — 서버는 재정렬하지 않으므로 여기서
  // 직접 순서를 바꾼다(applyAcceptedSuggestions). 저장 전 미리보기 단계라
  // PATCH를 호출하지 않고, 바뀐 순서가 그대로 저장 요청에 실린다.
  function handleAcceptSuggestion(suggestion: ItinerarySuggestion) {
    setAcceptedSuggestionKeys((prev) =>
      new Set(prev).add(suggestionKey(suggestion)),
    );
  }

  function handleSave(title: string) {
    if (phase.status !== "preview") return;
    const previewData = phase.data;
    // 저장 버튼은 안을 이미 확정한 뒤(variantChosen)에만 보이므로, 위에서
    // 계산한 previewDays가 곧 탭으로 고른 안에 수락한 순서변경을 반영하고
    // AI 추천을 지운 결과다.
    // 장소가 없는 날이 있으면 백엔드가 저장을 거부한다(저장 버튼도 이미 막혀 있음).
    if (hasEmptyDay(previewDays)) return;

    setPhase({ status: "saving", data: previewData });

    const request: SaveItineraryRequest = {
      title,
      region: previewData.region,
      travelDate: previewData.travelDate,
      duration: previewData.duration,
      days: toSaveDays(previewDays),
    };

    saveMutation.mutate(request, {
      onSuccess: (saved) => {
        addSavedItinerary({
          itineraryId: saved.itineraryId,
          title: saved.title,
          region: saved.region,
          travelDate: saved.travelDate,
          duration: saved.duration,
          savedAt: Date.now(),
        });
        // 저장 시점 지도 상태(좌표·경로)를 스냅샷으로 남긴다 — 저장한 일정을
        // 다시 볼 때 재조회 없이 지도를 그린다. 아직 해석 중이던 날은 스냅샷에서
        // 빠지고 조회 시 라이브 폴백된다.
        setMapSnapshot(saved.itineraryId, toSnapshot(mapData));
        setTitleDraft(null);
        setPhase({ status: "saved", data: saved });
      },
      onError: (err) => {
        const parsed = parseApiError(err);
        setPhase({ status: "preview", data: previewData, error: parsed });
      },
    });
  }

  if (phase.status === "saved") {
    return (
      <SavedItineraryPanel key={phase.data.itineraryId} data={phase.data} />
    );
  }

  // 안(variants)이 여러 개면 결과 화면 대신 먼저 카드로 비교해 고르게 한다.
  // 저장/로그인 전 미리보기 화면은 이 선택 뒤에야 등장한다.
  if (
    (phase.status === "preview" || phase.status === "loginPreview") &&
    !variantChosen &&
    phase.data.variants.length > 1
  ) {
    return (
      <VariantSelector
        variants={phase.data.variants}
        onSelect={handleSelectVariant}
        onClose={handleCancelVariantSelection}
      />
    );
  }

  if (phase.status === "loginPreview") {
    // 로그인 전/후 결과 화면을 통일한다: 사이드바는 preview와 동일한
    // TripSummary, "예시" 안내는 일차 카드 위 작은 배너로 둔다. 위에서 계산한
    // previewDays가 곧 이 안(activeVariant)에 순서변경·AI 추천 지우기를
    // 반영한 결과다.
    const activeVariant = activeVariantOf(phase.data, selectedVariantIndex);
    const previewItemCount = previewDays.reduce(
      (sum, day) => sum + day.items.length,
      0,
    );
    return (
      <ItineraryResultLayout
        region={phase.data.region}
        duration={phase.data.duration}
        travelDate={phase.data.travelDate}
        days={previewDays}
        mapData={mapData}
        travelMode={activeVariant.travelMode}
        actions={
          <>
            <Button asChild>
              <Link
                href={`/login?next=${encodeURIComponent(loginNext)}`}
                onClick={() => saveBasket(basketSnapshotRef.current)}
              >
                로그인하고 계속하기
              </Link>
            </Button>
            {/* "다시 생성"은 바구니를 복원하지 않는다(로그인 버튼을 누를
                때만 복원). 로그인 후 성공 시와 동일하게 비운 상태로 둔다. */}
            <Button
              variant="outline"
              onClick={() => setPhase({ status: "idle" })}
            >
              다시 생성
            </Button>
          </>
        }
        banner={
          <>
            {/* 제안은 variants[0] 기준으로 계산되므로 그 안을 보고 있을 때만. */}
            {selectedVariantIndex === 0 && (
              <CongestionSuggestions
                suggestions={phase.data.suggestions}
                acceptedKeys={acceptedSuggestionKeys}
                onAccept={handleAcceptSuggestion}
              />
            )}
            <p className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-[13px] text-primary">
              이 일정은 담아주신 콘텐츠로 만든 예시예요. 로그인하면 실제로
              저장할 수 있어요.
            </p>
          </>
        }
        sidebar={
          <>
            <TripSummary
              regions={parsedRegions}
              startDate={startDate}
              nights={parsedNights}
              companions={parsedCompanions}
              items={basketSnapshotRef.current}
              showItemList={false}
              itemCount={previewItemCount}
              days={previewDays}
              travelSummary={null}
              departureTime={previewDays[0]?.items[0]?.startTime ?? null}
              walkingMinutes={activeVariant.metrics.totalWalkingMinutes}
            />
            <TripDistanceCard
              mapDays={mapData.days}
              days={previewDays}
              travelMode={activeVariant.travelMode}
            />
          </>
        }
      >
        {(selectedDayIndex, onSelectDay) => (
          <ItineraryResult
            data={{
              days: previewDays,
              adjustments: activeVariant.adjustments,
            }}
            mapData={mapData}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={onSelectDay}
            hideMap
            hideAdjustments
            onDismissAiSuggestion={handleDismissAiSuggestion}
            travelMode={activeVariant.travelMode}
            // buildLoginPreviewItinerary(로컬 목데이터)는 startContentId를
            // 반영하지 않고 순번대로 날짜를 배분하므로, 여기서 배지를 붙이면
            // 엉뚱한 장소가 "출발"로 표시될 수 있다 — 이 경로에서는 생략한다.
          />
        )}
      </ItineraryResultLayout>
    );
  }

  if (phase.status === "preview" || phase.status === "saving") {
    const isSaving = phase.status === "saving";
    // 위에서 계산한 previewDays가 곧 이 안(activeVariant)에 순서변경·AI
    // 추천 지우기를 반영한 결과다.
    const activeVariant = activeVariantOf(phase.data, selectedVariantIndex);
    const blockedByEmptyDay = hasEmptyDay(previewDays);
    return (
      <ItineraryResultLayout
        region={phase.data.region}
        duration={phase.data.duration}
        travelDate={phase.data.travelDate}
        days={previewDays}
        mapData={mapData}
        travelMode={activeVariant.travelMode}
        actions={
          <>
            {titleDraft === null ? (
              <>
                <Button
                  disabled={isSaving || blockedByEmptyDay}
                  onClick={() => setTitleDraft(activeVariant.title)}
                >
                  저장
                </Button>
                <Button
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setPhase({ status: "idle" })}
                >
                  다시 생성
                </Button>
              </>
            ) : (
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = titleDraft.trim();
                  if (!trimmed) return;
                  handleSave(trimmed);
                }}
              >
                <label htmlFor="itinerary-title" className="sr-only">
                  일정명
                </label>
                <input
                  id="itinerary-title"
                  className="w-80 rounded-md border border-input px-3 py-2 text-sm sm:w-[28rem]"
                  value={titleDraft}
                  disabled={isSaving}
                  onChange={(e) => setTitleDraft(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={() => setTitleDraft(null)}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || titleDraft.trim() === ""}
                >
                  {isSaving ? "저장 중..." : "저장하기"}
                </Button>
              </form>
            )}
            <Button variant="outline" asChild>
              <Link href="/dashboard">대시보드로 가기</Link>
            </Button>
          </>
        }
        banner={
          <>
            {/* 제안은 variants[0] 기준으로 계산되므로 그 안을 보고 있을 때만. */}
            {selectedVariantIndex === 0 && (
              <CongestionSuggestions
                suggestions={phase.data.suggestions}
                acceptedKeys={acceptedSuggestionKeys}
                onAccept={handleAcceptSuggestion}
              />
            )}
            <AdjustmentsNotice adjustments={activeVariant.adjustments} />
            {phase.status === "preview" && phase.error && (
              <p className="text-sm text-destructive">
                {phase.error.message}
                {phase.error.traceId && ` (참고: ${phase.error.traceId})`}
              </p>
            )}
            {blockedByEmptyDay && (
              <p className="text-sm text-muted-foreground">
                장소가 없는 날이 있어 저장할 수 없어요. 기간을 줄이거나 다시
                생성해보세요.
              </p>
            )}
          </>
        }
        sidebar={
          <>
            <TripSummary
              regions={parsedRegions}
              startDate={startDate}
              nights={parsedNights}
              companions={parsedCompanions}
              items={items}
              showItemList={false}
              // 생성 성공 시 로컬 바구니를 비우므로(handleGenerate), 결과 화면의
              // "담은 콘텐츠" 수는 실제 일정에 배치된 장소 수로 표시한다.
              itemCount={previewDays.reduce(
                (sum, day) => sum + day.items.length,
                0,
              )}
              days={previewDays}
              travelSummary={sumDayTravel(previewDays)}
              departureTime={previewDays[0]?.items[0]?.startTime ?? null}
              walkingMinutes={activeVariant.metrics.totalWalkingMinutes}
            />
            <TripDistanceCard
              mapDays={mapData.days}
              days={previewDays}
              travelMode={activeVariant.travelMode}
            />
          </>
        }
      >
        {(selectedDayIndex, onSelectDay) => (
          <ItineraryResult
            data={{
              days: previewDays,
              adjustments: activeVariant.adjustments,
            }}
            mapData={mapData}
            selectedDayIndex={selectedDayIndex}
            onSelectDay={onSelectDay}
            hideMap
            hideAdjustments
            travelMode={activeVariant.travelMode}
            onDismissAiSuggestion={handleDismissAiSuggestion}
            startContentId={requestedStartContentId}
          />
        )}
      </ItineraryResultLayout>
    );
  }

  // 생성 중에는 핸드오프 스펙(§9 "생성 중")대로 화면 전체를 스피너로 채운다.
  if (phase.status === "loading") {
    return <GeneratingState />;
  }

  // 생성 전(idle) · 생성 실패(error) 화면. 오류는 재시도 버튼과 함께
  // PreGenerateView 상단에 배너로 노출한다.
  return (
    <PreGenerateView
      regions={regions}
      startDate={startDate}
      nights={nights}
      companions={companions}
      onGenerate={handleGenerate}
      error={
        phase.status === "error"
          ? { message: phase.message, traceId: phase.traceId }
          : null
      }
    />
  );
}
