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

export async function updateBasketConditions(
  request: UpdateBasketConditionsRequest,
  accessToken?: string,
): Promise<BasketResponse> {
  const { data } = await apiClient.put<BasketResponse>(
    "/api/v1/baskets/conditions",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
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
