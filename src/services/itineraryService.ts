import { apiFetch } from "@/services/apiClient";
import type {
  GenerateItineraryRequest,
  GenerateItineraryResponse,
} from "@/types/itinerary";

export async function generateItinerary(
  request: GenerateItineraryRequest,
): Promise<GenerateItineraryResponse> {
  return apiFetch<GenerateItineraryResponse>("/api/v1/itineraries", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
