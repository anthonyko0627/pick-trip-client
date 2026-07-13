import { apiFetch } from "@/services/apiClient";
import type {
  AddBasketItemRequest,
  BasketItemResponse,
  BasketResponse,
  UpdateBasketConditionsRequest,
} from "@/types/basket";

export async function updateBasketConditions(
  request: UpdateBasketConditionsRequest,
): Promise<BasketResponse> {
  return apiFetch<BasketResponse>("/api/v1/baskets/conditions", {
    method: "PUT",
    body: JSON.stringify(request),
  });
}

export async function addBasketItem(
  request: AddBasketItemRequest,
): Promise<BasketItemResponse> {
  return apiFetch<BasketItemResponse>("/api/v1/baskets/items", {
    method: "POST",
    body: JSON.stringify(request),
  });
}
