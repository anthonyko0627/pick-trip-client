import type { Content } from "@/types/content";
import type { Region } from "@/types/region";
import type { ServerCompanionCondition } from "@/types/travel-condition";

export type BasketPriority = "MUST" | "SHOULD" | "OPTIONAL";

export const PRIORITY_LABELS: Record<BasketPriority, string> = {
  MUST: "꼭 가기",
  SHOULD: "가면 좋음",
  OPTIONAL: "시간 남으면",
};

// 우선순위별 선택 상태 배지 색상 (참고 디자인: 꼭 가기=amber, 가면 좋음=teal, 시간 남으면=gray)
export const PRIORITY_SELECTED_CLASSES: Record<BasketPriority, string> = {
  MUST: "bg-amber-500 text-white",
  SHOULD: "bg-teal-600 text-white",
  OPTIONAL: "bg-gray-500 text-white",
};

export interface BasketItem {
  content: Content;
  addedAt: number;
  priority: BasketPriority | null;
  // 사용자가 직접 지정한 희망 체류시간(분). null이면 AI가 알아서 정한다.
  desiredStayMinutes: number | null;
}

// 체류시간 select가 제시하는 선택지. 0번째(null)는 "AI가 정함" 기본값이다.
export const STAY_MINUTES_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "AI가 정함" },
  { value: 30, label: "30분" },
  { value: 60, label: "1시간" },
  { value: 90, label: "1시간 30분" },
  { value: 120, label: "2시간" },
  { value: 180, label: "3시간" },
];

// ── 서버 바구니 API 계약 (/api/v1/baskets/*) ──────────────────────
// 백엔드 우선순위 enum은 프론트 BasketPriority와 이름이 다르다.
export type ServerBasketPriority = "MUST_VISIT" | "PREFERRED" | "OPTIONAL";

export const BASKET_PRIORITY_TO_SERVER: Record<
  BasketPriority,
  ServerBasketPriority
> = {
  MUST: "MUST_VISIT",
  SHOULD: "PREFERRED",
  OPTIONAL: "OPTIONAL",
};

export interface UpdateBasketConditionsRequest {
  region: Region;
  travelDate: string; // "YYYY-MM-DD"
  duration: number;
  companions: ServerCompanionCondition[];
}

export interface AddBasketItemRequest {
  contentId: string;
  priority: ServerBasketPriority;
  title?: string;
  thumbnailUrl?: string;
  contentTypeId?: string;
  desiredStayMinutes?: number;
}

export interface BasketItemResponse {
  itemId: string;
  contentId: string;
  title: string;
  thumbnailUrl?: string;
  contentTypeId?: string;
  priority: ServerBasketPriority;
  desiredStayMinutes?: number | null;
}

export interface Conditions {
  region: Region;
  travelDate: string;
  duration: number;
  companions: ServerCompanionCondition[];
}

export interface BasketResponse {
  basketId: string;
  conditions: Conditions;
  items: BasketItemResponse[];
}
