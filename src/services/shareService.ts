import { apiClient } from "@/services/apiClient";
import type {
  ShareCreateResponse,
  SharedItineraryResponse,
} from "@/types/itinerary";

export async function createShare(
  itineraryId: string,
): Promise<ShareCreateResponse> {
  const { data } = await apiClient.post<ShareCreateResponse>(
    `/api/v1/itineraries/${itineraryId}/share`,
  );
  return data;
}

export async function getSharedItinerary(
  token: string,
): Promise<SharedItineraryResponse> {
  const { data } = await apiClient.get<SharedItineraryResponse>(
    `/api/v1/share/${token}`,
  );
  // 프론트는 duration을 "박 수"(당일치기=0)로 다루지만 백엔드는 "일수"(당일치기=1)로
  // 정의한다(.agents/docs/domain-model.md). 서비스 경계에서 변환한다.
  return { ...data, duration: data.duration - 1 };
}
