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
  // 백엔드 원본 응답: duration은 일수(박 수+1) 기준
  const rawServerResponse: ItineraryGenerateResponse = {
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 2,
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

  const expectedResult: ItineraryGenerateResponse = {
    ...rawServerResponse,
    duration: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("요청 바디 없이 POST /api/v1/itineraries/generate를 호출하고, 응답 duration을 박 수로 변환", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });

    const result = await generateItinerary();

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      undefined,
      { headers: undefined },
    );
    expect(result).toEqual(expectedResult);
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
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });

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

  // 백엔드 원본 응답: duration은 일수(박 수+1) 기준
  const rawServerResponse: ItineraryResponse = {
    itineraryId: "itinerary-1",
    title: mockRequest.title,
    region: mockRequest.region,
    travelDate: mockRequest.travelDate,
    duration: mockRequest.duration + 1,
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

  const expectedResult: ItineraryResponse = {
    ...rawServerResponse,
    duration: mockRequest.duration,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/itineraries를 호출하며 duration을 박 수+1(일수)로 변환하고, 응답 duration은 다시 박 수로 변환", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });

    const result = await saveItinerary(mockRequest);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      { ...mockRequest, duration: mockRequest.duration + 1 },
      { headers: undefined },
    );
    expect(result).toEqual(expectedResult);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });

    await saveItinerary(mockRequest, "access-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries",
      { ...mockRequest, duration: mockRequest.duration + 1 },
      { headers: { Authorization: "Bearer access-1" } },
    );
  });
});

describe("getItinerary", () => {
  // 백엔드 원본 응답: duration은 일수(박 수+1) 기준
  const rawServerResponse: ItineraryResponse = {
    itineraryId: "itinerary-1",
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 2,
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

  const expectedResult: ItineraryResponse = {
    ...rawServerResponse,
    duration: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/itineraries/{itineraryId}를 호출하고, 응답 duration을 박 수로 변환", async () => {
    mockGet.mockResolvedValueOnce({ data: rawServerResponse });

    const result = await getItinerary("itinerary-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1");
    expect(result).toEqual(expectedResult);
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

  // 백엔드 원본 응답: duration은 일수(박 수+1) 기준
  const rawServerResponse: ItineraryResponse = {
    itineraryId: "itinerary-1",
    title: mockRequest.title,
    region: mockRequest.region,
    travelDate: mockRequest.travelDate,
    duration: mockRequest.duration + 1,
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

  const expectedResult: ItineraryResponse = {
    ...rawServerResponse,
    duration: mockRequest.duration,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH /api/v1/itineraries/{itineraryId}를 호출하며 duration을 박 수+1(일수)로 변환하고, 응답 duration은 다시 박 수로 변환", async () => {
    mockPatch.mockResolvedValueOnce({ data: rawServerResponse });

    const result = await modifyItinerary("itinerary-1", mockRequest);

    expect(mockPatch).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1", {
      ...mockRequest,
      duration: mockRequest.duration + 1,
    });
    expect(result).toEqual(expectedResult);
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
