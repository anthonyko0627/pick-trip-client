import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import type {
  AddBasketItemRequest,
  BasketItemResponse,
  BasketResponse,
  UpdateBasketConditionsRequest,
} from "@/types/basket";
import { apiClient } from "./apiClient";
import { addBasketItem, updateBasketConditions } from "./basketService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);

describe("updateBasketConditions", () => {
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
    mockPut.mockResolvedValueOnce({ data: mockResponse });

    const result = await updateBasketConditions(mockRequest);

    expect(mockPut).toHaveBeenCalledWith(
      "/api/v1/baskets/conditions",
      mockRequest,
      { headers: undefined },
    );
    expect(result).toEqual(mockResponse);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPut.mockResolvedValueOnce({ data: mockResponse });

    await updateBasketConditions(mockRequest, "access-1");

    expect(mockPut).toHaveBeenCalledWith(
      "/api/v1/baskets/conditions",
      mockRequest,
      { headers: { Authorization: "Bearer access-1" } },
    );
  });
});

describe("addBasketItem", () => {
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
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await addBasketItem(mockRequest);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/baskets/items",
      mockRequest,
      { headers: undefined },
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiClient가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new ApiError(
      409,
      "이미 바구니에 담은 콘텐츠입니다.",
      "BASKET_ITEM_DUPLICATE",
    );
    mockPost.mockRejectedValueOnce(testError);

    await expect(addBasketItem(mockRequest)).rejects.toThrow(testError);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    await addBasketItem(mockRequest, "access-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/baskets/items",
      mockRequest,
      { headers: { Authorization: "Bearer access-1" } },
    );
  });
});
