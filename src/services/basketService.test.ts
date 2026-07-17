import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AddBasketItemRequest,
  BasketItemResponse,
  BasketResponse,
  UpdateBasketConditionsRequest,
} from "@/types/basket";
import * as apiClientModule from "./apiClient";
import { addBasketItem, updateBasketConditions } from "./basketService";

vi.mock("./apiClient");

describe("updateBasketConditions", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockRequest: UpdateBasketConditionsRequest = {
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 1,
    companions: ["WITH_CHILD"],
  };

  const mockResponse: BasketResponse = {
    basketId: "basket-1",
    conditions: mockRequest,
    items: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PUT /api/v1/baskets/conditions를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await updateBasketConditions(mockRequest);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/baskets/conditions",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(mockRequest),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    await updateBasketConditions(mockRequest, "access-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/baskets/conditions",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-1" },
      }),
    );
  });
});

describe("addBasketItem", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockRequest: AddBasketItemRequest = {
    contentId: "content-1",
    priority: "MUST_VISIT",
    title: "하동 스타트업 카페",
  };

  const mockResponse: BasketItemResponse = {
    itemId: "item-1",
    contentId: "content-1",
    title: "하동 스타트업 카페",
    priority: "MUST_VISIT",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/baskets/items를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await addBasketItem(mockRequest);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/baskets/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockRequest),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new Error(
      '{"code":"BASKET_ITEM_DUPLICATE","message":"이미 바구니에 담은 콘텐츠입니다.","traceId":"t-1"}',
    );
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(addBasketItem(mockRequest)).rejects.toThrow(testError);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    await addBasketItem(mockRequest, "access-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/baskets/items",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-1" },
      }),
    );
  });
});
