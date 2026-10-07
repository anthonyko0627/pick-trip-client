import { authHeaders } from "@/lib/http";
import { apiClient } from "@/services/apiClient";
import type {
  Day,
  ItineraryGenerateRequest,
  ItineraryGenerateResponse,
  ItineraryResponse,
  ItineraryVariant,
  ItineraryVariantMetrics,
  RawGeneratedDay,
  RawGeneratedVariant,
  RawItineraryGenerateResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";

// 프론트는 duration을 UI 개념인 "박 수"(당일치기=0)로 다루지만, 백엔드는
// "일수"(당일치기=1, 최소 1)로 정의한다(.agents/docs/domain-model.md). 서비스
// 경계에서만 변환해 나머지 화면 코드는 계속 박 수 기준으로 다루게 한다.
function nightsToServerDuration(nights: number): number {
  return nights + 1;
}

function serverDurationToNights(duration: number): number {
  return duration - 1;
}

// 생성 응답은 저장 전 미리보기라 dayId/itemId/pinned가 없다. 화면(DayCard,
// 순서 이동/삭제)은 저장된 일정과 같은 Day[]를 전제로 id를 key와 조작 대상으로
// 쓰므로, 여기서 응답 안에서만 유일한 id를 합성해 채운다. 저장 후에는 서버가
// 발급한 진짜 id로 교체된다.
function withSyntheticIds(days: RawGeneratedDay[]): Day[] {
  return days.map((day) => ({
    dayId: `generated-day-${day.dayIndex}`,
    dayIndex: day.dayIndex,
    // 저장/공유 응답과 달리 generate 응답에만 오는 필드까지 명시적으로 옮긴다.
    // undefined가 아닌 null/[]로 정규화해 화면·테스트에서 다루기 쉽게 한다.
    date: day.date ?? null,
    totalTravelMinutes: day.totalTravelMinutes ?? null,
    totalTravelKm: day.totalTravelKm ?? null,
    dayNotes: day.dayNotes ?? [],
    items: day.items.map((item) => ({
      itemId: `generated-item-${day.dayIndex}-${item.order}-${item.contentId}`,
      contentId: item.contentId,
      title: item.title,
      order: item.order,
      reason: item.reason,
      pinned: false,
      startTime: item.startTime ?? null,
      endTime: item.endTime ?? null,
      notes: item.notes ?? [],
      addedByAi: item.addedByAi,
      addedForRest: item.addedForRest,
      // v3: 구버전 백엔드는 안 보내므로 "해당 없음"과 같은 뜻인 0으로 채운다.
      elevationGainMeters: item.elevationGainMeters ?? 0,
      inclinePenaltyMinutes: item.inclinePenaltyMinutes ?? 0,
    })),
  }));
}

// 모든 안이 같은 키 집합을 반환한다는 백엔드 계약(pick-trip-server 저장소
// .agents/docs/api-endpoints.md)에 맞춰, variants가 아예 없을 때(구버전
// 백엔드·로컬 목데이터) 최상위 필드로 합성하는 기본 안의 metrics는 전부
// 산출 불가로 채운다.
const UNKNOWN_METRICS: ItineraryVariantMetrics = {
  totalTravelMinutes: null,
  totalWalkingMinutes: null,
  totalTransitCost: null,
  placeCount: null,
  unavailableReasons: {},
};

function hydrateVariant(variant: RawGeneratedVariant): ItineraryVariant {
  return {
    label: variant.label,
    travelMode: variant.travelMode,
    title: variant.title,
    days: withSyntheticIds(variant.days),
    adjustments: variant.adjustments ?? [],
    // 구버전 백엔드가 개별 variant에 metrics를 채우지 않고 보낼 수 있다 —
    // 없으면 산출 불가로 채워 VariantSelector·TripSummary의 metrics 접근이
    // TypeError로 화면 전체를 크래시시키지 않게 한다.
    metrics: variant.metrics ?? UNKNOWN_METRICS,
  };
}

// v2 이전 백엔드나 variants를 채우지 않는 로컬 목데이터를 위한 폴백. 실제
// 요청 바디 없이 호출했을 때 서버가 이미 자동차 단일 variants를 채워 보내므로
// 정상 운영에서는 거치지 않는다.
function fallbackVariant(
  data: RawItineraryGenerateResponse,
): RawGeneratedVariant {
  return {
    label: "자동차 힐링 루트",
    travelMode: "CAR",
    title: data.title,
    days: data.days,
    adjustments: data.adjustments ?? [],
    metrics: UNKNOWN_METRICS,
  };
}

// generate는 선택 요청 바디(mode/startContentId/travelModes)를 받는다. 바디를
// 보내지 않으면 서버에 저장된 사용자의 바구니/조건만 읽어 기존과 동일하게
// (자동차 단일안) 생성한다. 호출 전에 basketService로 바구니/조건을 서버에
// 반영해야 한다.
export async function generateItinerary(
  options?: ItineraryGenerateRequest,
  accessToken?: string,
): Promise<ItineraryGenerateResponse> {
  const { data } = await apiClient.post<RawItineraryGenerateResponse>(
    "/api/v1/itineraries/generate",
    options,
    { headers: authHeaders(accessToken) },
  );

  const rawVariants =
    data.variants && data.variants.length > 0
      ? data.variants
      : [fallbackVariant(data)];
  const variants = rawVariants.map(hydrateVariant);
  // title/days/adjustments는 variants[0]의 복제라는 백엔드 계약과 동일하게,
  // 별도로 다시 옮기지 않고 같은 값을 그대로 참조한다.
  const [firstVariant] = variants;

  return {
    ...data,
    duration: serverDurationToNights(data.duration),
    title: firstVariant.title,
    days: firstVariant.days,
    adjustments: firstVariant.adjustments,
    variants,
    suggestions: data.suggestions ?? [],
  };
}

export async function saveItinerary(
  request: SaveItineraryRequest,
  accessToken?: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.post<ItineraryResponse>(
    "/api/v1/itineraries",
    { ...request, duration: nightsToServerDuration(request.duration) },
    { headers: authHeaders(accessToken) },
  );
  return { ...data, duration: serverDurationToNights(data.duration) };
}

export async function getItinerary(
  itineraryId: string,
  accessToken?: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.get<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
    { headers: authHeaders(accessToken) },
  );
  return { ...data, duration: serverDurationToNights(data.duration) };
}

export async function modifyItinerary(
  itineraryId: string,
  request: SaveItineraryRequest,
  accessToken?: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.patch<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
    { ...request, duration: nightsToServerDuration(request.duration) },
    { headers: authHeaders(accessToken) },
  );
  return { ...data, duration: serverDurationToNights(data.duration) };
}
