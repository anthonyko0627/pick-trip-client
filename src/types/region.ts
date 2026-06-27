export type Region = "HADONG" | "YEONGJU" | "YECHEON";

export const REGIONS = ["HADONG", "YEONGJU", "YECHEON"] as const;

export const REGION_LABELS: Record<Region, string> = {
  HADONG: "하동",
  YEONGJU: "영주",
  YECHEON: "예천",
};

export const REGION_DESCRIPTIONS: Record<Region, string> = {
  HADONG: "차와 강이 있는 조용한 가족 여행",
  YEONGJU: "아이와 함께 배우는 역사·문화 여행",
  YECHEON: "체험과 자연을 함께 즐기는 조용한 가족 여행",
};

export const REGION_COLORS: Record<Region, string> = {
  HADONG: "#059669",
  YEONGJU: "#D97706",
  YECHEON: "#0891B2",
};
