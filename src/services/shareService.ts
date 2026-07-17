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
  return data;
}
