import { apiFetch } from "@/services/apiClient";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";

// generate는 요청 바디를 받지 않는다 — 서버에 저장된 사용자의 바구니/조건을 읽어 생성한다.
// 호출 전에 basketService로 바구니/조건을 서버에 반영해야 한다.
export async function generateItinerary(): Promise<ItineraryGenerateResponse> {
  return apiFetch<ItineraryGenerateResponse>("/api/v1/itineraries/generate", {
    method: "POST",
  });
}

export async function saveItinerary(
  request: SaveItineraryRequest,
): Promise<ItineraryResponse> {
  return apiFetch<ItineraryResponse>("/api/v1/itineraries", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
