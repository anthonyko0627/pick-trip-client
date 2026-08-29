import type { IconName } from "@/components/ui/icon";
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

// 카테고리 필터 칩에서 라벨 앞에 붙는 아이콘.
// pick-trip-app(Ionicons)이 쓰는 이름과 모양을 그대로 맞춘다.
export const CATEGORY_ICONS: Record<ContentCategory, IconName> = {
  FOOD: "restaurant-outline",
  FESTIVAL: "sparkles-outline",
  ATTRACTION: "compass-outline",
  CULTURE: "library-outline",
  NATURE: "leaf-outline",
  EXPERIENCE: "color-palette-outline",
};

export const CONTENT_CATEGORIES = Object.keys(
  CATEGORY_LABELS,
) as ContentCategory[];

// 지역 × 카테고리 콘텐츠 수. 백엔드 /api/v1/contents를 지역별로 끝까지
// 페이지네이션하며 아이템 category 필드를 직접 집계한 2026-08-29 실측치.
// 카테고리는 백엔드가 클라이언트 필터가 없어 목록 헤더에서 "이 카테고리 전체
// N개" 문구를 동적으로 못 만든다 — 홈 히어로 CONTENT_COUNT·QuickCategoryRow와
// 같은 성격의 정적 값이다. TourAPI 카탈로그 변동으로 흔들리면 수동 갱신한다.
// 합계 221 (하동 102 + 영주 68 + 예천 51).
export const CATEGORY_COUNT_BY_REGION: Record<
  Region,
  Record<ContentCategory, number>
> = {
  HADONG: {
    FOOD: 27,
    FESTIVAL: 2,
    ATTRACTION: 5,
    CULTURE: 27,
    NATURE: 19,
    EXPERIENCE: 22,
  },
  YEONGJU: {
    FOOD: 20,
    FESTIVAL: 0,
    ATTRACTION: 13,
    CULTURE: 23,
    NATURE: 6,
    EXPERIENCE: 6,
  },
  YECHEON: {
    FOOD: 6,
    FESTIVAL: 0,
    ATTRACTION: 6,
    CULTURE: 26,
    NATURE: 8,
    EXPERIENCE: 5,
  },
};

/** 선택한 지역들에서 선택한 카테고리들의 정적 콘텐츠 수 합. */
export function categoryCountFor(
  categories: ContentCategory[],
  regions: Region[],
): number {
  let sum = 0;
  for (const region of regions) {
    for (const category of categories) {
      sum += CATEGORY_COUNT_BY_REGION[region]?.[category] ?? 0;
    }
  }
  return sum;
}

// 카테고리별 배지 색상 (참고 디자인의 카테고리 컬러 매핑을 6개 카테고리로 확장)
export const CATEGORY_BADGE_CLASSES: Record<ContentCategory, string> = {
  FOOD: "bg-amber-50 text-amber-700",
  FESTIVAL: "bg-purple-50 text-purple-700",
  ATTRACTION: "bg-teal-50 text-teal-700",
  CULTURE: "bg-indigo-50 text-indigo-700",
  NATURE: "bg-green-50 text-green-700",
  EXPERIENCE: "bg-blue-50 text-blue-700",
};

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
  // 위경도. 백엔드가 TourAPI mapy/mapx 에서 채우며, 원본이 비면 0 이 온다
  // (유효성 판단은 src/lib/geo.ts isValidKoreaCoord 가 담당).
  latitude: number;
  longitude: number;
}

export interface ContentsResponse {
  contents: Content[];
  total: number;
}

// GET /api/v1/contents/{id}/nearby 한 항목. 기준 콘텐츠 좌표에서의 Haversine
// 근사 거리(distanceKm, km)와 자기 좌표를 함께 들고 온다. 목록/상세와 달리
// 이 응답은 category·좌표를 항상 채워주므로 좌표는 필수값으로 둔다.
export interface NearbyContent extends Content {
  // TourAPI contentTypeId (상세 카테고리 매핑용). 응답에 없으면 생략.
  contentTypeId?: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export interface NearbyContentsResponse {
  originContentId: string;
  // 서버가 클램프한 실제 반경(km). 요청값과 다를 수 있다.
  radiusKm: number;
  contents: NearbyContent[];
}
