import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import type {
  ItineraryGenerateRequest,
  ItineraryGenerateResponse,
  ItineraryResponse,
  RawItineraryGenerateResponse,
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
  // 백엔드 원본 응답: duration은 일수(박 수+1) 기준이고, 저장 전 미리보기라
  // dayId/itemId/pinned가 없다. v2 백엔드는 옵션을 안 보내도 자동차 단일
  // variants를 항상 채워 보낸다.
  const rawDays: RawItineraryGenerateResponse["days"] = [
    {
      dayIndex: 0,
      date: "2025-01-15",
      totalTravelMinutes: 20,
      totalTravelKm: 3.5,
      dayNotes: ["하루 총 이동시간이 약 20분입니다."],
      items: [
        {
          contentId: "content-1",
          title: "예천군 문화유산",
          order: 0,
          reason: "지역 대표 명소",
          startTime: "09:00",
          endTime: "10:30",
          notes: ["개장 전 도착이라 09:00까지 대기가 필요합니다."],
        },
      ],
    },
  ];
  const rawAdjustments = [
    "'예천군 문화유산'은 1일차(수)에 휴무여서 2일차로 옮겼습니다.",
  ];
  const rawServerResponse: RawItineraryGenerateResponse = {
    title: "하동 1박 2일 여행",
    region: "HADONG",
    travelDate: "2025-01-15",
    duration: 2,
    adjustments: rawAdjustments,
    days: rawDays,
    variants: [
      {
        label: "자동차 힐링 루트",
        travelMode: "CAR",
        title: "하동 1박 2일 여행",
        days: rawDays,
        adjustments: rawAdjustments,
        metrics: {
          totalTravelMinutes: 20,
          totalWalkingMinutes: 0,
          totalTransitCost: 284,
          placeCount: 1,
          unavailableReasons: {},
        },
      },
    ],
    suggestions: [],
  };

  // 화면이 key와 조작 대상으로 쓰는 id는 서비스 경계에서 합성해 채운다.
  const hydratedDays: ItineraryGenerateResponse["days"] = [
    {
      dayId: "generated-day-0",
      dayIndex: 0,
      date: "2025-01-15",
      totalTravelMinutes: 20,
      totalTravelKm: 3.5,
      dayNotes: ["하루 총 이동시간이 약 20분입니다."],
      items: [
        {
          itemId: "generated-item-0-0-content-1",
          contentId: "content-1",
          title: "예천군 문화유산",
          order: 0,
          reason: "지역 대표 명소",
          pinned: false,
          startTime: "09:00",
          endTime: "10:30",
          notes: ["개장 전 도착이라 09:00까지 대기가 필요합니다."],
          addedByAi: undefined,
          addedForRest: undefined,
          // v3: 구버전 백엔드(원본 응답에 필드 없음) 호환 기본값.
          elevationGainMeters: 0,
          inclinePenaltyMinutes: 0,
        },
      ],
    },
  ];
  const expectedResult: ItineraryGenerateResponse = {
    ...rawServerResponse,
    duration: 1,
    days: hydratedDays,
    adjustments: rawAdjustments,
    variants: [
      {
        label: "자동차 힐링 루트",
        travelMode: "CAR",
        title: "하동 1박 2일 여행",
        days: hydratedDays,
        adjustments: rawAdjustments,
        metrics: {
          totalTravelMinutes: 20,
          totalWalkingMinutes: 0,
          totalTransitCost: 284,
          placeCount: 1,
          unavailableReasons: {},
        },
      },
    ],
    suggestions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("요청 바디 없이 POST /api/v1/itineraries/generate를 호출하고, 응답 duration을 박 수로 변환하며 variants/suggestions를 그대로 반영", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });

    const result = await generateItinerary();

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      undefined,
      { headers: undefined },
    );
    expect(result).toEqual(expectedResult);
    // 최상위 days/adjustments는 variants[0]의 복제 — 같은 참조를 그대로 쓴다.
    expect(result.days).toBe(result.variants[0]?.days);
    expect(result.adjustments).toBe(result.variants[0]?.adjustments);
  });

  it("옵션(mode/startContentId/travelModes)을 전달하면 요청 바디에 그대로 실어 보낸다", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });
    const options: ItineraryGenerateRequest = {
      mode: "AUGMENT",
      startContentId: "content-1",
      travelModes: ["CAR", "TRANSIT"],
    };

    await generateItinerary(options, "access-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      options,
      { headers: { Authorization: "Bearer access-1" } },
    );
  });

  it("variants가 없는 응답(구버전 백엔드)은 최상위 필드로 안 하나를 합성한다", async () => {
    const legacyResponse: RawItineraryGenerateResponse = {
      title: rawServerResponse.title,
      region: rawServerResponse.region,
      travelDate: rawServerResponse.travelDate,
      duration: rawServerResponse.duration,
      adjustments: rawAdjustments,
      days: rawDays,
      // variants/suggestions 필드 자체가 없다.
    };
    mockPost.mockResolvedValueOnce({ data: legacyResponse });

    const result = await generateItinerary();

    expect(result.variants).toEqual([
      {
        label: "자동차 힐링 루트",
        travelMode: "CAR",
        title: rawServerResponse.title,
        days: hydratedDays,
        adjustments: rawAdjustments,
        metrics: {
          totalTravelMinutes: null,
          totalWalkingMinutes: null,
          totalTransitCost: null,
          placeCount: null,
          unavailableReasons: {},
        },
      },
    ]);
    expect(result.suggestions).toEqual([]);
    expect(result.days).toBe(result.variants[0]?.days);
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

  it("accessToken만 전달하면 바디 없이 Authorization 헤더만 붙인다", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });

    await generateItinerary(undefined, "access-1");

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      undefined,
      { headers: { Authorization: "Bearer access-1" } },
    );
  });

  it("v3: dayStartTimes 옵션을 요청 바디에 그대로 실어 보낸다", async () => {
    mockPost.mockResolvedValueOnce({ data: rawServerResponse });
    const options: ItineraryGenerateRequest = {
      dayStartTimes: ["10:30", null],
    };

    await generateItinerary(options);

    expect(mockPost).toHaveBeenCalledWith(
      "/api/v1/itineraries/generate",
      options,
      { headers: undefined },
    );
  });

  it("v3: 응답 스톱의 elevationGainMeters/inclinePenaltyMinutes를 그대로 반영한다", async () => {
    // variants를 생략해 fallbackVariant가 data.days를 그대로 쓰게 한다 —
    // variants가 있으면 최상위 days는 variants[0].days의 복제일 뿐이라 여기서
    // 고친 값이 반영되지 않는다.
    const responseWithIncline: RawItineraryGenerateResponse = {
      title: rawServerResponse.title,
      region: rawServerResponse.region,
      travelDate: rawServerResponse.travelDate,
      duration: rawServerResponse.duration,
      adjustments: rawAdjustments,
      days: [
        {
          ...rawDays[0],
          items: [
            {
              ...rawDays[0].items[0],
              elevationGainMeters: 120.5,
              inclinePenaltyMinutes: 12,
            },
          ],
        },
      ],
    };
    mockPost.mockResolvedValueOnce({ data: responseWithIncline });

    const result = await generateItinerary();

    expect(result.days[0]?.items[0]).toMatchObject({
      elevationGainMeters: 120.5,
      inclinePenaltyMinutes: 12,
    });
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
        totalTravelMinutes: 25,
        totalTravelKm: 4.2,
        items: [
          {
            itemId: "item-1",
            contentId: "content-1",
            title: "예천군 문화유산",
            order: 0,
            reason: "지역 대표 명소",
            pinned: false,
            startTime: "09:00",
            endTime: "10:30",
          },
        ],
      },
    ],
  };

  // 저장 응답의 이동 요약·방문 시각은 { ...data }로 그대로 통과한다.
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

    expect(mockGet).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1", {
      headers: undefined,
    });
    expect(result).toEqual(expectedResult);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockGet.mockResolvedValueOnce({ data: rawServerResponse });

    await getItinerary("itinerary-1", "access-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1", {
      headers: { Authorization: "Bearer access-1" },
    });
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

    expect(mockPatch).toHaveBeenCalledWith(
      "/api/v1/itineraries/itinerary-1",
      { ...mockRequest, duration: mockRequest.duration + 1 },
      { headers: undefined },
    );
    expect(result).toEqual(expectedResult);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPatch.mockResolvedValueOnce({ data: rawServerResponse });

    await modifyItinerary("itinerary-1", mockRequest, "access-1");

    expect(mockPatch).toHaveBeenCalledWith(
      "/api/v1/itineraries/itinerary-1",
      { ...mockRequest, duration: mockRequest.duration + 1 },
      { headers: { Authorization: "Bearer access-1" } },
    );
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
