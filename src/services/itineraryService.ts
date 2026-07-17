import { apiClient } from "@/services/apiClient";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

// generate는 요청 바디를 받지 않는다 — 서버에 저장된 사용자의 바구니/조건을 읽어 생성한다.
// 호출 전에 basketService로 바구니/조건을 서버에 반영해야 한다.
export async function generateItinerary(
  accessToken?: string,
): Promise<ItineraryGenerateResponse> {
  const { data } = await apiClient.post<ItineraryGenerateResponse>(
    "/api/v1/itineraries/generate",
    undefined,
    { headers: authHeaders(accessToken) },
  );
  return data;
}

export async function saveItinerary(
  request: SaveItineraryRequest,
  accessToken?: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.post<ItineraryResponse>(
    "/api/v1/itineraries",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
}

export async function getItinerary(
  itineraryId: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.get<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
  );
  return data;
}

export async function modifyItinerary(
  itineraryId: string,
  request: SaveItineraryRequest,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.patch<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
    request,
  );
  return data;
}
