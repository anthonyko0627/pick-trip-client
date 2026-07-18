import { apiClient } from "@/services/apiClient";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

// 프론트는 duration을 UI 개념인 "박 수"(당일치기=0)로 다루지만, 백엔드는
// "일수"(당일치기=1, 최소 1)로 정의한다(.agents/docs/domain-model.md). 서비스
// 경계에서만 변환해 나머지 화면 코드는 계속 박 수 기준으로 다루게 한다.
function nightsToServerDuration(nights: number): number {
  return nights + 1;
}

function serverDurationToNights(duration: number): number {
  return duration - 1;
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
  return { ...data, duration: serverDurationToNights(data.duration) };
}

export async function saveItinerary(
  request: SaveItineraryRequest,
  accessToken?: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.post<ItineraryResponse>(
    "/api/v1/itineraries",
    { ...request, duration: nightsToServerDuration(request.duration) },
    { headers: authHeaders(accessToken) },
  );
  return { ...data, duration: serverDurationToNights(data.duration) };
}

export async function getItinerary(
  itineraryId: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.get<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
  );
  return { ...data, duration: serverDurationToNights(data.duration) };
}

export async function modifyItinerary(
  itineraryId: string,
  request: SaveItineraryRequest,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.patch<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
    { ...request, duration: nightsToServerDuration(request.duration) },
  );
  return { ...data, duration: serverDurationToNights(data.duration) };
}
