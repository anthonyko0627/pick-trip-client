import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ShareCreateResponse,
  SharedItineraryResponse,
} from "@/types/itinerary";
import * as apiClientModule from "./apiClient";
import { createShare, getSharedItinerary } from "./shareService";

vi.mock("./apiClient");

describe("createShare", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: ShareCreateResponse = {
    token: "share-token-1",
    shareUrl: "https://pick-trip.example.com/share/share-token-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/itineraries/{itineraryId}/share를 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await createShare("itinerary-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries/itinerary-1/share",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new Error('API 401: {"code":"AUTH_REQUIRED"}');
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(createShare("itinerary-1")).rejects.toThrow(testError);
  });
});

describe("getSharedItinerary", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: SharedItineraryResponse = {
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2026-08-01",
    duration: 1,
    days: [
      {
        dayId: "day-1",
        dayIndex: 0,
        items: [
          {
            itemId: "item-1",
            contentId: "content-1",
            title: "쌍계사",
            order: 0,
            reason: "지역 대표 명소",
            pinned: false,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/share/{token}을 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await getSharedItinerary("share-token-1");

    expect(mockApiFetch).toHaveBeenCalledWith("/api/v1/share/share-token-1");
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파(유효하지 않은 토큰 등)", async () => {
    const testError = new Error(
      'API 404: {"code":"SHARE_NOT_FOUND","message":"유효하지 않은 공유 링크입니다."}',
    );
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(getSharedItinerary("invalid-token")).rejects.toThrow(
      testError,
    );
  });
});
