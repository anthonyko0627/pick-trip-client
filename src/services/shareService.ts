import { apiFetch } from "@/services/apiClient";
import type {
  ShareCreateResponse,
  SharedItineraryResponse,
} from "@/types/itinerary";

export async function createShare(
  itineraryId: string,
): Promise<ShareCreateResponse> {
  return apiFetch<ShareCreateResponse>(
    `/api/v1/itineraries/${itineraryId}/share`,
    { method: "POST" },
  );
}

export async function getSharedItinerary(
  token: string,
): Promise<SharedItineraryResponse> {
  return apiFetch<SharedItineraryResponse>(`/api/v1/share/${token}`);
}
