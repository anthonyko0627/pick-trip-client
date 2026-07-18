import { apiClient } from "@/services/apiClient";
import type {
  AddBasketItemRequest,
  BasketItemResponse,
  BasketResponse,
  UpdateBasketConditionsRequest,
} from "@/types/basket";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

// 프론트는 duration을 UI 개념인 "박 수"(당일치기=0)로 다루지만, 백엔드는
// "일수"(당일치기=1, 최소 1)로 정의한다(.agents/docs/domain-model.md). 서비스
// 경계에서만 변환해 나머지 화면 코드는 계속 박 수 기준으로 다루게 한다.
export async function updateBasketConditions(
  request: UpdateBasketConditionsRequest,
  accessToken?: string,
): Promise<BasketResponse> {
  const { data } = await apiClient.put<BasketResponse>(
    "/api/v1/baskets/conditions",
    { ...request, duration: request.duration + 1 },
    { headers: authHeaders(accessToken) },
  );
  return {
    ...data,
    conditions: { ...data.conditions, duration: data.conditions.duration - 1 },
  };
}

export async function addBasketItem(
  request: AddBasketItemRequest,
  accessToken?: string,
): Promise<BasketItemResponse> {
  const { data } = await apiClient.post<BasketItemResponse>(
    "/api/v1/baskets/items",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
}
