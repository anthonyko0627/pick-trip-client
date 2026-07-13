import type { Region } from "@/types/region";

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
}

export interface ItemRequest {
  contentId: string;
  title?: string;
  order?: number;
  reason?: string;
  pinned?: boolean;
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
}

export interface Item {
  itemId: string;
  contentId: string;
  title: string;
  order: number;
  reason: string;
  pinned: boolean;
  // 백엔드 Item 스키마에는 startTime/endTime/stayDuration/needsVerification이 없다.
  // 화면 표시용으로 필요하면 별도 확인 후 추가한다.
}

// ── 생성 응답 (POST /api/v1/itineraries/generate) ───────────────────
// generate는 요청 바디를 받지 않는다 — 서버에 저장된 사용자의 바구니/조건을 읽어 생성한다.
export interface ItineraryGenerateResponse {
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  days: Day[];
}
