import type { Region } from "@/types/region";

export type ContentCategory =
  | "FOOD"
  | "FESTIVAL"
  | "ATTRACTION"
  | "CULTURE"
  | "NATURE"
  | "EXPERIENCE";

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  FOOD: "음식",
  FESTIVAL: "축제",
  ATTRACTION: "관광지",
  CULTURE: "문화",
  NATURE: "자연",
  EXPERIENCE: "체험",
};

export const CONTENT_CATEGORIES = Object.keys(
  CATEGORY_LABELS,
) as ContentCategory[];

export interface Content {
  id: string;
  name: string;
  region: Region;
  // 목록/상세 조회 API가 아직 내려주지 않는 필드라 선택값으로 둔다.
  category?: ContentCategory;
  imageUrl: string | null;
  address: string;
  summary?: string;
  indoor?: boolean;
}

export interface ContentDetail extends Content {
  operatingHours: string | null;
  closedDay: string | null;
  parking: boolean | null;
  stayDuration: string | null;
  reservationRequired: boolean | null;
  dataSource: string | null;
  imageUrls: string[];
}

export interface ContentsResponse {
  contents: Content[];
  total: number;
}
