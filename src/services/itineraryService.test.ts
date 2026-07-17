import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";
import * as apiClientModule from "./apiClient";
import {
  generateItinerary,
  getItinerary,
  modifyItinerary,
  saveItinerary,
} from "./itineraryService";

vi.mock("./apiClient");

describe("generateItinerary", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: ItineraryGenerateResponse = {
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 1,
    days: [
      {
        dayId: "day-1",
        dayIndex: 0,
        items: [
          {
            itemId: "item-1",
            contentId: "content-1",
            title: "예천군 문화유산",
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

  it("요청 바디 없이 POST /api/v1/itineraries/generate를 호출", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await generateItinerary();

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new Error('API 401: {"code":"AUTH_REQUIRED"}');
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(generateItinerary()).rejects.toThrow(testError);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    await generateItinerary("access-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-1" },
      }),
    );
  });
});

describe("saveItinerary", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockRequest: SaveItineraryRequest = {
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 1,
    days: [
      {
        dayIndex: 0,
        items: [{ contentId: "content-1", order: 0 }],
      },
    ],
  };

  const mockResponse: ItineraryResponse = {
    itineraryId: "itinerary-1",
    title: mockRequest.title,
    region: mockRequest.region,
    travelDate: mockRequest.travelDate,
    duration: mockRequest.duration,
    lastModifiedAt: "2025-01-15T10:00:00Z",
    days: [
      {
        dayId: "day-1",
        dayIndex: 0,
        items: [
          {
            itemId: "item-1",
            contentId: "content-1",
            title: "예천군 문화유산",
            order: 0,
            reason: "",
            pinned: false,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/itineraries를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await saveItinerary(mockRequest);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(mockRequest),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    await saveItinerary(mockRequest, "access-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      expect.objectContaining({
        headers: { Authorization: "Bearer access-1" },
      }),
    );
  });
});

describe("getItinerary", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockResponse: ItineraryResponse = {
    itineraryId: "itinerary-1",
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 1,
    lastModifiedAt: "2025-01-15T10:00:00Z",
    days: [
      {
        dayId: "day-1",
        dayIndex: 0,
        items: [
          {
            itemId: "item-1",
            contentId: "content-1",
            title: "예천군 문화유산",
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

  it("GET /api/v1/itineraries/{itineraryId}를 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await getItinerary("itinerary-1");

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries/itinerary-1",
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new Error(
      'API 404: {"code":"ITINERARY_NOT_FOUND","message":"일정을 찾을 수 없습니다."}',
    );
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(getItinerary("missing-id")).rejects.toThrow(testError);
  });
});

describe("modifyItinerary", () => {
  const mockApiFetch = vi.mocked(apiClientModule.apiFetch);

  const mockRequest: SaveItineraryRequest = {
    title: "하동 1박 2일 여행(수정됨)",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 1,
    days: [
      {
        dayIndex: 0,
        items: [{ contentId: "content-1", order: 0, pinned: true }],
      },
    ],
  };

  const mockResponse: ItineraryResponse = {
    itineraryId: "itinerary-1",
    title: mockRequest.title,
    region: mockRequest.region,
    travelDate: mockRequest.travelDate,
    duration: mockRequest.duration,
    lastModifiedAt: "2025-01-16T10:00:00Z",
    days: [
      {
        dayId: "day-1",
        dayIndex: 0,
        items: [
          {
            itemId: "item-1",
            contentId: "content-1",
            title: "예천군 문화유산",
            order: 0,
            reason: "",
            pinned: true,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH /api/v1/itineraries/{itineraryId}를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockApiFetch.mockResolvedValueOnce(mockResponse);

    const result = await modifyItinerary("itinerary-1", mockRequest);

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/v1/itineraries/itinerary-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(mockRequest),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiFetch가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new Error('API 401: {"code":"AUTH_REQUIRED"}');
    mockApiFetch.mockRejectedValueOnce(testError);

    await expect(modifyItinerary("itinerary-1", mockRequest)).rejects.toThrow(
      testError,
    );
  });
});
