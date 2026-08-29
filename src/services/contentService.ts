import { splitPageSizeAcrossRegions } from "@/lib/content";
import {
  CONTENT_IMAGE_OVERRIDES,
  overrideContentImage,
  overrideContentName,
} from "@/lib/contentOverrides";
import type {
  Content,
  ContentCategory,
  ContentDetail,
  ContentsResponse,
  NearbyContent,
  NearbyContentsResponse,
} from "@/types/content";
import type { Region } from "@/types/region";

import { apiClient } from "./apiClient";

export interface GetContentsParams {
  regions: string[];
  startDate: string;
  nights: number;
  companions?: string[];
  // "더보기" 페이지네이션용. 둘 다 없으면 백엔드 기본값(0페이지, 지역당 20개)을 쓴다.
  page?: number;
  size?: number;
}

// 백엔드 /api/v1/contents 목록 응답의 실제 필드 구조.
interface RawContentItem {
  contentId: string;
  title: string;
  address: string;
  firstImage: string;
  category?: ContentCategory;
  summary?: string | null;
  indoor?: boolean;
}

interface RawContentsResponse {
  totalCount: number;
  items: RawContentItem[];
}

function toContent(item: RawContentItem, region: Region): Content {
  return {
    id: item.contentId,
    name: overrideContentName(item.contentId, item.title),
    region,
    category: item.category,
    imageUrl: overrideContentImage(item.contentId, item.firstImage || null),
    address: item.address,
    summary: item.summary ?? undefined,
    indoor: item.indoor,
  };
}

// 백엔드가 region을 한 번에 하나만 받으므로, 선택된 지역마다 따로 호출해 합친다.
// size가 주어지면 지역별로 쪼개(splitPageSizeAcrossRegions) 한 페이지 합계가
// 정확히 size가 되게 한다 — 모든 지역에 같은 size를 주면 size × 지역 수개가 온다.
export async function getContents(
  params: GetContentsParams,
): Promise<ContentsResponse> {
  const regionSizes =
    params.size !== undefined
      ? splitPageSizeAcrossRegions(params.size, params.regions.length)
      : undefined;

  const responses = await Promise.all(
    params.regions.map((region, i) => {
      const query = new URLSearchParams({
        region,
        startDate: params.startDate,
        nights: String(params.nights),
      });

      if (params.companions && params.companions.length > 0) {
        query.set("companions", params.companions.join(","));
      }
      if (params.page !== undefined) query.set("page", String(params.page));
      if (regionSizes) query.set("size", String(regionSizes[i]));

      return apiClient
        .get<RawContentsResponse>(`/api/v1/contents?${query.toString()}`)
        .then((res) => res.data);
    }),
  );

  const contents = responses.flatMap((res, i) =>
    res.items.map((item) => toContent(item, params.regions[i] as Region)),
  );
  const total = responses.reduce((sum, res) => sum + res.totalCount, 0);

  return { contents, total };
}

// 백엔드 /api/v1/contents/{id} 상세 응답의 실제 필드 구조.
interface RawContentDetail {
  contentId: string;
  title: string;
  address: string;
  summary: string;
  useTime: string | null;
  restDate: string | null;
  parking: string | null;
  stayDuration: string | null;
  reservationRequired: boolean | null;
  dataSource: string | null;
  images: { imageUrl: string; title: string }[];
  category?: ContentCategory;
  indoor?: boolean;
  region: Region;
  latitude: number;
  longitude: number;
}

function toParkingAvailable(parking: string | null): boolean | null {
  if (!parking) return null;
  return !parking.includes("불가");
}

function toContentDetail(raw: RawContentDetail): ContentDetail {
  const images = raw.images.map((i) => i.imageUrl);
  // 이미지 오버라이드가 있으면 대표 이미지로 쓰고(카드와 통일), 원본 갤러리는
  // 중복만 빼고 뒤에 붙인다. 없으면 기존대로 images[0]를 대표로 쓴다.
  const override = CONTENT_IMAGE_OVERRIDES[raw.contentId];
  const imageUrl = override ?? images[0] ?? null;
  return {
    id: raw.contentId,
    name: overrideContentName(raw.contentId, raw.title),
    region: raw.region,
    category: raw.category,
    imageUrl,
    address: raw.address,
    summary: raw.summary,
    indoor: raw.indoor,
    operatingHours: raw.useTime,
    closedDay: raw.restDate,
    parking: toParkingAvailable(raw.parking),
    stayDuration: raw.stayDuration,
    reservationRequired: raw.reservationRequired,
    dataSource: raw.dataSource,
    // ContentDetailView가 [imageUrl, ...imageUrls]로 갤러리를 합치므로 중복을 피해 나머지만 담는다.
    imageUrls: override
      ? images.filter((url) => url !== imageUrl)
      : images.slice(1),
    // 좌표는 계약 그대로 통과시킨다. 0/무효 판정은 지도 레이어(geo.ts)에서 한다.
    latitude: raw.latitude,
    longitude: raw.longitude,
  };
}

export async function getContentById(id: string): Promise<ContentDetail> {
  const { data } = await apiClient.get<RawContentDetail>(
    `/api/v1/contents/${id}`,
  );
  return toContentDetail(data);
}

// 백엔드 /api/v1/contents/{id}/nearby 응답의 실제 필드 구조.
interface RawNearbyContentItem {
  contentId: string;
  title: string;
  contentTypeId: string | null;
  address: string;
  firstImage: string | null;
  latitude: number;
  longitude: number;
  category?: ContentCategory;
  summary?: string | null;
  // region은 @Enumerated(STRING)이라 "HADONG" 같은 코드로 온다.
  region: Region;
  distanceKm: number;
}

interface RawNearbyContentsResponse {
  originContentId: string;
  radiusKm: number;
  items: RawNearbyContentItem[];
}

function toNearbyContent(item: RawNearbyContentItem): NearbyContent {
  return {
    id: item.contentId,
    name: overrideContentName(item.contentId, item.title),
    region: item.region,
    category: item.category,
    imageUrl: overrideContentImage(item.contentId, item.firstImage || null),
    address: item.address,
    summary: item.summary ?? undefined,
    contentTypeId: item.contentTypeId ?? undefined,
    latitude: item.latitude,
    longitude: item.longitude,
    distanceKm: item.distanceKm,
  };
}

export interface GetNearbyContentsParams {
  // 반경(km). 서버 기본 5, 최대 20으로 클램프된다.
  radiusKm?: number;
  // 결과 개수. 서버 기본 10, 최대 30으로 클램프된다.
  size?: number;
}

// 기준 콘텐츠 좌표를 중심으로 반경 내 주변 콘텐츠를 거리순으로 조회한다.
// 기준 콘텐츠가 로컬에 없으면 404 CONTENT_NOT_FOUND, 좌표가 없거나 (0,0)이면
// 404 CONTENT_LOCATION_UNKNOWN이 ApiError로 던져진다.
export async function getNearbyContents(
  contentId: string,
  params: GetNearbyContentsParams = {},
): Promise<NearbyContentsResponse> {
  const query = new URLSearchParams();
  if (params.radiusKm !== undefined) {
    query.set("radiusKm", String(params.radiusKm));
  }
  if (params.size !== undefined) query.set("size", String(params.size));
  const qs = query.toString();

  const { data } = await apiClient.get<RawNearbyContentsResponse>(
    `/api/v1/contents/${contentId}/nearby${qs ? `?${qs}` : ""}`,
  );

  return {
    originContentId: data.originContentId,
    radiusKm: data.radiusKm,
    contents: data.items.map(toNearbyContent),
  };
}
