import type { Content } from "@/types/content";
import type { Region } from "@/types/region";
import type { ServerCompanionCondition } from "@/types/travel-condition";

export type BasketPriority = "MUST" | "SHOULD" | "OPTIONAL";

export const PRIORITY_LABELS: Record<BasketPriority, string> = {
  MUST: "꼭 가기",
  SHOULD: "가면 좋음",
  OPTIONAL: "시간 남으면",
};

export interface BasketItem {
  content: Content;
  addedAt: number;
  priority: BasketPriority | null;
}

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
}

export interface BasketItemResponse {
  itemId: string;
  contentId: string;
  title: string;
  thumbnailUrl?: string;
  contentTypeId?: string;
  priority: ServerBasketPriority;
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
