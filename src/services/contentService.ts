import type {
  Content,
  ContentCategory,
  ContentDetail,
  ContentsResponse,
} from "@/types/content";
import type { Region } from "@/types/region";

import { apiClient } from "./apiClient";

interface GetContentsParams {
  regions: string[];
  startDate: string;
  nights: number;
  companions?: string[];
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
    name: item.title,
    region,
    category: item.category,
    imageUrl: item.firstImage || null,
    address: item.address,
    summary: item.summary ?? undefined,
    indoor: item.indoor,
  };
}

// 백엔드가 region을 한 번에 하나만 받으므로, 선택된 지역마다 따로 호출해 합친다.
export async function getContents(
  params: GetContentsParams,
): Promise<ContentsResponse> {
  const responses = await Promise.all(
    params.regions.map((region) => {
      const query = new URLSearchParams({
        region,
        startDate: params.startDate,
        nights: String(params.nights),
      });

      if (params.companions && params.companions.length > 0) {
        query.set("companions", params.companions.join(","));
      }

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
}

function toParkingAvailable(parking: string | null): boolean | null {
  if (!parking) return null;
  return !parking.includes("불가");
}

function toContentDetail(raw: RawContentDetail): ContentDetail {
  const images = raw.images.map((i) => i.imageUrl);
  return {
    id: raw.contentId,
    name: raw.title,
    region: raw.region,
    category: raw.category,
    imageUrl: images[0] ?? null,
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
    imageUrls: images.slice(1),
  };
}

export async function getContentById(id: string): Promise<ContentDetail> {
  const { data } = await apiClient.get<RawContentDetail>(
    `/api/v1/contents/${id}`,
  );
  return toContentDetail(data);
}
