import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  GenerateItineraryRequest,
  GenerateItineraryResponse,
} from "@/types/itinerary";
import * as apiClientModule from "./apiClient";
import { generateItinerary } from "./itineraryService";

vi.mock("./apiClient");

describe("generateItinerary", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: GenerateItineraryResponse = {
    itineraryId: "itinerary-123",
    days: [
      {
        date: "2025-01-15",
        dayNumber: 1,
        places: [
          {
            contentId: "content-1",
            name: "예천군 문화유산",
            startTime: "09:00",
            endTime: "11:00",
            stayDuration: "2시간",
            reason: "지역 대표 명소",
            needsVerification: false,
          },
        ],
      },
    ],
    generatedAt: "2025-01-10T10:00:00Z",
  };

  const mockRequest: GenerateItineraryRequest = {
    regions: ["HADONG"],
    startDate: "2025-01-15",
    nights: 1,
    companions: [
      {
        ageGroup: "ADULT",
        preferences: ["CULTURE", "NATURE"],
      },
    ],
    contents: [
      {
        contentId: "content-1",
        priority: "HIGH",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("성공 케이스: apiFetch가 성공 응답 반환 시 GenerateItineraryResponse를 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await generateItinerary(mockRequest);

    expect(result).toEqual(mockResponse);
  });

  it("요청 본문 검증: apiFetch가 POST /api/v1/itineraries에 올바른 JSON body로 호출", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    await generateItinerary(mockRequest);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockRequest),
      }),
    );
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new Error("API 400: Invalid request");
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(generateItinerary(mockRequest)).rejects.toThrow(testError);
  });

  it("빈 companions: companions가 빈 배열일 때도 정상 호출", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const requestWithEmptyCompanions: GenerateItineraryRequest = {
      ...mockRequest,
      companions: [],
    };

    await generateItinerary(requestWithEmptyCompanions);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestWithEmptyCompanions),
      }),
    );
  });

  it("null priority: contents 배열 아이템의 priority가 null일 때도 정상 직렬화", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const requestWithNullPriority: GenerateItineraryRequest = {
      ...mockRequest,
      contents: [
        {
          contentId: "content-1",
          priority: null,
        },
      ],
    };

    await generateItinerary(requestWithNullPriority);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestWithNullPriority),
      }),
    );
  });
});
