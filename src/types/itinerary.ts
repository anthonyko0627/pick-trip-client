import type { BasketPriority } from "@/types/basket";
import type { Region } from "@/types/region";
import type { CompanionCondition } from "@/types/travel-condition";

// ── API 요청 ──────────────────────────────────────────────
export interface GenerateItineraryRequest {
  regions: Region[];
  startDate: string; // "YYYY-MM-DD"
  nights: number; // 0 = 당일치기
  companions: CompanionCondition[];
  contents: ItineraryContentInput[];
}

export interface ItineraryContentInput {
  contentId: string;
  priority: BasketPriority | null;
}

// ── API 응답 ──────────────────────────────────────────────
export interface GenerateItineraryResponse {
  itineraryId: string;
  days: ItineraryDay[];
  generatedAt: string; // ISO 8601
}

export interface ItineraryDay {
  date: string; // "YYYY-MM-DD"
  dayNumber: number; // 1-based
  places: ItineraryPlace[];
}

export interface ItineraryPlace {
  contentId: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  stayDuration: string; // 예: "1시간 30분"
  reason: string; // AI 배치 이유
  needsVerification: boolean; // 방문 전 확인 필요
}
