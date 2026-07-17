import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";
import { apiClient } from "./apiClient";
import {
  generateItinerary,
  getItinerary,
  modifyItinerary,
  saveItinerary,
} from "./itineraryService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);

describe("generateItinerary", () => {
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
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await generateItinerary();

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      undefined,
      { headers: undefined },
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiClient가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new ApiError(
      408,
      "일정 생성에 실패했습니다. 다시 시도해주세요.",
      "ITINERARY_GENERATION_TIMEOUT",
    );
    mockPost.mockRejectedValueOnce(testError);

    await expect(generateItinerary()).rejects.toThrow(testError);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    await generateItinerary("access-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      undefined,
      { headers: { Authorization: "Bearer access-1" } },
    );
  });
});

describe("saveItinerary", () => {
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
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await saveItinerary(mockRequest);

    expect(mockPost).toHaveBeenCalledWith("/api/v1/itineraries", mockRequest, {
      headers: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    await saveItinerary(mockRequest, "access-1");

    expect(mockPost).toHaveBeenCalledWith("/api/v1/itineraries", mockRequest, {
      headers: { Authorization: "Bearer access-1" },
    });
  });
});

describe("getItinerary", () => {
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
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getItinerary("itinerary-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1");
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiClient가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new ApiError(
      404,
      "일정을 찾을 수 없습니다.",
      "ITINERARY_NOT_FOUND",
    );
    mockGet.mockRejectedValueOnce(testError);

    await expect(getItinerary("missing-id")).rejects.toThrow(testError);
  });
});

describe("modifyItinerary", () => {
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
    mockPatch.mockResolvedValueOnce({ data: mockResponse });

    const result = await modifyItinerary("itinerary-1", mockRequest);

    expect(mockPatch).toHaveBeenCalledWith(
      "/api/v1/itineraries/itinerary-1",
      mockRequest,
    );
    expect(result).toEqual(mockResponse);
  });

  it("오류 전파: apiClient가 throw 하면 오류를 그대로 전파", async () => {
    const testError = new ApiError(
      401,
      "로그인이 필요합니다.",
      "AUTH_REQUIRED",
    );
    mockPatch.mockRejectedValueOnce(testError);

    await expect(modifyItinerary("itinerary-1", mockRequest)).rejects.toThrow(
      testError,
    );
  });
});
