import type { Content } from "@/types/content";

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
