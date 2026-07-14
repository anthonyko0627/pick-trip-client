import { apiFetch } from "@/services/apiClient";
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
  return apiFetch<BasketResponse>("/api/v1/baskets/conditions", {
    method: "PUT",
    body: JSON.stringify(request),
    headers: authHeaders(accessToken),
  });
}

export async function addBasketItem(
  request: AddBasketItemRequest,
  accessToken?: string,
): Promise<BasketItemResponse> {
  return apiFetch<BasketItemResponse>("/api/v1/baskets/items", {
    method: "POST",
    body: JSON.stringify(request),
    headers: authHeaders(accessToken),
  });
}
