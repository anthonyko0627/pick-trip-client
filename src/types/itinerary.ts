import type { Region } from "@/types/region";

// ── 생성 요청 옵션 (POST generate, v2) ───────────────────────────────
// 전부 선택 필드다. 아무것도 안 보내면 기존과 완전히 같은 결과(자동차 단일안)가
// 온다(pick-trip-server 저장소 .agents/docs/api-endpoints.md 참고).
export type ItineraryGenerateMode = "STRICT" | "AUGMENT";
export type TravelMode = "CAR" | "TRANSIT";

export const TRAVEL_MODE_LABELS: Record<TravelMode, string> = {
  CAR: "자동차",
  TRANSIT: "대중교통",
};

// 이동수단은 사용자가 미리 고르지 않고 항상 전체를 요청한다 — 결과 화면의
// VariantSelector 카드에서 하나를 고르게 하기 위함이다. 새로 generate를
// 호출하는 곳(PreGenerateView·autoResume)이 늘어나도 같은 기본값을 쓰도록
// 한 곳에 둔다.
export const ALL_TRAVEL_MODES: TravelMode[] = ["CAR", "TRANSIT"];

export interface ItineraryGenerateRequest {
  // STRICT(기본) = 바구니에 담은 장소만. AUGMENT = AI가 같은 지역 콘텐츠를
  // 추가 제안할 수 있음(추가된 항목은 addedByAi: true로 표시).
  mode?: ItineraryGenerateMode;
  // 여행을 시작할 바구니 항목의 contentId. 지정하면 그 장소가 해당 일차의
  // 첫 스톱으로 고정된다. 미지정이어도 일차 배분·순서 최적화는 항상 수행되며,
  // 이 값은 앵커 고정 여부만 결정한다. 바구니에 없는 값이면
  // ITINERARY_INPUT_INSUFFICIENT.
  startContentId?: string;
  // 만들 일정안의 이동수단. 기본 ["CAR"], 중복 제거, 최대 4개. 지정한 수만큼
  // variants[]에 안이 하나씩 나온다.
  travelModes?: TravelMode[];
  // v3: 일차별 시작 시각("HH:mm"). 인덱스 = 일차(0 → 1일차). null이나 짧은
  // 배열의 빈 자리는 기본 09:00. DAY_START_TIME_MIN~MAX 밖이면 서버가 400
  // VALIDATION_FAILED로 거절(잘라내지 않음). 안 보내면 전부 09:00(기존과 동일).
  dayStartTimes?: (string | null)[];
}

// v3: dayStartTimes 입력 UI가 고를 수 있는 범위. 벗어난 값은 서버가 400으로
// 거절하므로, 선택지 자체를 이 범위로 제한해 오류를 사전에 막는다.
export const DAY_START_TIME_MIN = "05:00";
export const DAY_START_TIME_MAX = "18:00";

// ── 저장/수정 요청 공용 (POST save, PATCH modify) ──────────────────
export interface SaveItineraryRequest {
  title: string;
  region: Region;
  travelDate: string; // "YYYY-MM-DD"
  duration: number;
  days: DayRequest[];
}

export interface DayRequest {
  dayIndex: number;
  items: ItemRequest[];
  // 미리보기에서 받은 하루 이동 요약을 그대로 되돌려 저장한다(서버는 저장 시
  // 스케줄러를 다시 돌리지 않으므로 클라이언트가 왕복시켜야 값이 유지된다).
  totalTravelMinutes?: number;
  totalTravelKm?: number;
}

export interface ItemRequest {
  contentId: string;
  title?: string;
  order?: number;
  reason?: string;
  pinned?: boolean;
  // 미리보기에서 받은 방문 시각("HH:mm")을 그대로 되돌려 저장한다.
  startTime?: string;
  endTime?: string;
  // v3: 미리보기에서 받은 오르막 정보를 그대로 되돌려 저장한다. 순서를 바꿔
  // "이전 스톱"이 달라졌으면 생략(undefined)한다 — 서버는 저장 시 재계산하지
  // 않으므로 어긋난 값을 그대로 실어 보내면 안 된다(clearDaySchedule 참고).
  elevationGainMeters?: number;
  inclinePenaltyMinutes?: number;
}

// ── 조회/저장/수정 응답 공용 (GET, POST save, PATCH modify) ──────────
export interface ItineraryResponse {
  itineraryId: string;
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  lastModifiedAt: string; // ISO 8601
  days: Day[];
}

export interface Day {
  dayId: string;
  dayIndex: number;
  items: Item[];
  // 하루 이동 요약. 조회/저장/공유 응답 + generate 응답 모두에 있다(nullable).
  totalTravelMinutes?: number | null;
  totalTravelKm?: number | null;
  // date/dayNotes는 generate(미리보기) 응답 전용 — 저장·공유 응답에는 없다.
  date?: string | null; // "yyyy-MM-dd"
  dayNotes?: string[];
}

export interface Item {
  itemId: string;
  contentId: string;
  title: string;
  order: number;
  // 이 항목을 일정에 넣은 이유. addedForRest가 true면 자동 삽입 사유(도보
  // 시간 초과 / 상승고도 초과 / 둘 다)가 대신 이 필드에 한국어로 담긴다.
  reason: string;
  pinned: boolean;
  // 방문 시각("HH:mm"). 조회/저장/공유 + generate 응답 모두에 있다(nullable).
  startTime?: string | null;
  endTime?: string | null;
  // notes는 generate(미리보기) 응답 전용 — 저장·공유 응답에는 없다.
  notes?: string[];
  // v2: 서버가 사용자 선택 없이 끼워 넣은 항목 표시. 두 값이 동시에 true인
  // 경우는 없다. 실제 contentId를 가진 콘텐츠라 저장 요청에 그대로 실어
  // 보내도 된다. generate 응답 전용 — 저장·공유 응답에는 없다.
  // addedByAi: mode: AUGMENT에서 AI가 같은 지역 콘텐츠를 추가 제안했을 때.
  addedByAi?: boolean;
  // addedForRest: TRANSIT 안에서 누적 도보 90분 이상 또는 누적 상승고도
  // 200m 이상일 때 근처 카페를 30분 휴식 스톱으로 자동 삽입했을 때.
  addedForRest?: boolean;
  // v3: 이전 스톱 → 이 스톱(도착 구간) 기준 오르막 정보. 하루 첫 스톱·CAR
  // 일정안·도보가 아닌 TRANSIT 구간·고도 조회 실패 시 0(값이 없다는 뜻이
  // 아니라 "해당 없음"). inclinePenaltyMinutes는 이미 startTime/endTime/
  // totalTravelMinutes에 반영돼 있으므로 화면 합계에 다시 더하지 않는다.
  // 조회/저장 응답에도 같은 이름으로 있다(값이 없으면 0). 구버전 백엔드·기존
  // 테스트 픽스처 호환을 위해 옵셔널로 둔다.
  elevationGainMeters?: number;
  inclinePenaltyMinutes?: number;
}

// ── 생성 응답 (POST /api/v1/itineraries/generate) ───────────────────
// generate는 선택 요청 바디(ItineraryGenerateRequest)를 받는다. 바디를 보내지
// 않으면 서버에 저장된 사용자의 바구니/조건만 읽어 기존과 동일하게(자동차
// 단일안) 생성한다.
// 아직 저장 전이라 서버 응답에는 dayId/itemId/pinned가 없다. 화면은 저장된 일정과
// 같은 Day[]로 다루므로 itineraryService가 서비스 경계에서 id를 합성해 채운다.
export interface RawGeneratedDay {
  dayIndex: number;
  items: RawGeneratedItem[];
  date: string | null;
  totalTravelMinutes: number | null;
  totalTravelKm: number | null;
  dayNotes: string[];
}

export interface RawGeneratedItem {
  contentId: string;
  title: string;
  order: number;
  reason: string;
  startTime: string | null;
  endTime: string | null;
  notes: string[];
  addedByAi?: boolean;
  addedForRest?: boolean;
  // v3: 옵셔널 — 구버전 백엔드는 이 필드를 안 보낸다.
  elevationGainMeters?: number;
  inclinePenaltyMinutes?: number;
}

// ── 일정안 비교 지표 (variants[].metrics) ────────────────────────────
// 스플릿 뷰에서 안을 나란히 놓고 비교하기 위한 값. 별도 엔드포인트 없이 생성
// 응답에 포함된다. 모든 안이 같은 키 집합을 반환하며, 산출할 수 없는 지표도
// 키를 지우지 않고 값만 null로 내린다("키 없음"이 아니라 "값이 null"로 산출
// 불가를 판정한다). "해당 없음"은 산출 불가와 다르다 — 예를 들어 CAR의
// totalWalkingMinutes는 언제나 0(사유 코드 없음)이고, 방문 장소가 0~1곳이라
// 이동 구간이 없으면 교통비는 null이 아니라 0원이다.
export type MetricUnavailableReason = "UNKNOWN_TRAVEL_DISTANCE";

export interface ItineraryVariantMetrics {
  // 전 일차 이동 시간(분) 합. days[].totalTravelMinutes의 합과 같다.
  totalTravelMinutes: number | null;
  // 도보로 분류된 구간의 시간(분) 합. CAR은 항상 0.
  totalWalkingMinutes: number | null;
  // 총 예상 교통비(원). 상수 기반 개략 추정이며 환승 할인·통행료는 미반영.
  totalTransitCost: number | null;
  // 전 일차 방문 장소 수(휴식 스톱 포함).
  placeCount: number | null;
  // 산출하지 못한 지표의 사유 코드(지표명 → 코드). 전부 산출되면 {}.
  unavailableReasons: Record<string, MetricUnavailableReason>;
}

// ── 다중 일정안 (variants[]) ─────────────────────────────────────────
// travelModes에 넣은 이동수단마다 하나씩 나온다. AI 호출은 한 번뿐이고 같은
// 장소 집합으로 스케줄링만 이동수단별로 다시 돈다.
export interface RawGeneratedVariant {
  // 사용자에게 보여줄 안 이름 (예: "자동차 힐링 루트").
  label: string;
  travelMode: TravelMode;
  title: string;
  days: RawGeneratedDay[];
  adjustments: string[];
  metrics: ItineraryVariantMetrics;
}

export interface ItineraryVariant {
  label: string;
  travelMode: TravelMode;
  title: string;
  days: Day[];
  adjustments: string[];
  metrics: ItineraryVariantMetrics;
}

// ── 혼잡 기반 순서변경 제안 (최상위 suggestions[]) ───────────────────
// 첫 번째 안(variants[0])의 확정 시각 기준으로 계산해 최상위에만 둔다. 서버는
// 제안대로 재정렬하지 않으므로, 사용자가 수락하면 클라이언트가 순서를 바꾼
// days로 PATCH /api/v1/itineraries/{id}를 호출해 반영해야 한다.
export type ItinerarySuggestionType = "CONGESTION_REORDER";

export interface ItinerarySuggestion {
  type: ItinerarySuggestionType;
  // 사용자에게 보여줄 한국어 문장.
  message: string;
  dayIndex: number;
  // 붐비는 장소.
  contentId: string;
  // 대신 먼저 방문할 장소. 없으면 null.
  swapWithContentId: string | null;
}

export interface RawItineraryGenerateResponse {
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  days: RawGeneratedDay[];
  // 스케줄러가 AI 안을 어떻게 바꿨는지 설명하는 여정 단위 안내 문구. 서버가
  // 항상 보낸다(빈 배열일 수 있음). generate 응답에만 있다.
  adjustments: string[];
  // v2: 이동수단별 일정안. 서버는 항상 1개 이상 채워 보내지만, 구버전
  // 백엔드·로컬 목데이터 호환을 위해 optional로 두고 서비스 계층에서 비어
  // 있으면 최상위 필드로 안 하나를 합성해 채운다.
  variants?: RawGeneratedVariant[];
  // 혼잡 기반 순서변경 제안. 제안이 없으면 빈 배열(서버가 항상 보냄).
  suggestions?: ItinerarySuggestion[];
}

export interface ItineraryGenerateResponse {
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  // title/days/adjustments는 variants[0]의 복제다(itineraryService가 항상
  // 같은 값을 참조하도록 보장). variants를 그리는 화면은 이 세 필드를
  // 중복으로 그리지 않는다.
  days: Day[];
  adjustments: string[];
  // 이동수단별 일정안. itineraryService가 최소 1개를 보장한다.
  variants: ItineraryVariant[];
  suggestions: ItinerarySuggestion[];
}

// ── 저장한 일정 목록 (브라우저 로컬 저장, 서버 계약 아님) ───────────
// 로그인 + 서버 목록 조회 API가 없어 이 브라우저에 저장한 기록만 관리한다.
export interface SavedItinerarySummary {
  itineraryId: string;
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  savedAt: number; // Date.now()
}

// ── 공유 (POST /api/v1/itineraries/{itineraryId}/share) ─────────────
export interface ShareCreateResponse {
  token: string;
  shareUrl: string;
}

// ── 공유 조회 (GET /api/v1/share/{token}) ────────────────────────────
// 비로그인 사용자도 접근 가능한 공개·읽기 전용 응답이라 itineraryId를 노출하지 않는다.
export interface SharedItineraryResponse {
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  days: Day[];
}
