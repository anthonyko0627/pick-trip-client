import type { Content, ContentDetail, ContentsResponse } from "@/types/content";
import type { Region } from "@/types/region";

import { apiFetch } from "./apiClient";

interface GetContentsParams {
  regions: string[];
  startDate: string;
  nights: number;
  companions?: string[];
}

// 백엔드 /api/v1/contents 목록 응답의 실제 필드 구조.
// category/summary/indoor는 아직 내려주지 않는다.
interface RawContentItem {
  contentId: string;
  title: string;
  address: string;
  firstImage: string;
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
    imageUrl: item.firstImage || null,
    address: item.address,
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

      return apiFetch<RawContentsResponse>(
        `/api/v1/contents?${query.toString()}`,
      );
    }),
  );

  const contents = responses.flatMap((res, i) =>
    res.items.map((item) => toContent(item, params.regions[i] as Region)),
  );
  const total = responses.reduce((sum, res) => sum + res.totalCount, 0);

  return { contents, total };
}

export async function getContentById(id: string): Promise<ContentDetail> {
  return apiFetch<ContentDetail>(`/api/v1/contents/${id}`);
}
