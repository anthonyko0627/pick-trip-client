import type { ContentDetail, ContentsResponse } from "@/types/content";

import { apiFetch } from "./apiClient";

interface GetContentsParams {
  regions: string[];
  startDate: string;
  nights: number;
  companions?: string[];
}

export async function getContents(
  params: GetContentsParams,
): Promise<ContentsResponse> {
  const query = new URLSearchParams({
    regions: params.regions.join(","),
    startDate: params.startDate,
    nights: String(params.nights),
  });

  if (params.companions && params.companions.length > 0) {
    query.set("companions", params.companions.join(","));
  }

  return apiFetch<ContentsResponse>(`/api/v1/contents?${query.toString()}`);
}

export async function getContentById(id: string): Promise<ContentDetail> {
  return apiFetch<ContentDetail>(`/api/v1/contents/${id}`);
}
