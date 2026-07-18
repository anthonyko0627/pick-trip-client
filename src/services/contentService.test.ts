import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import { apiClient } from "./apiClient";
import { getContentById, getContents } from "./contentService";

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

describe("getContents (apiClient 이관)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("지역마다 GET /api/v1/contents를 호출하고 결과를 합쳐 반환한다", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          totalCount: 1,
          items: [
            {
              contentId: "c-1",
              title: "쌍계사",
              address: "하동군",
              firstImage: "https://example.com/1.jpg",
              category: "CULTURE",
              summary: "천년 고찰",
              indoor: true,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          totalCount: 2,
          items: [
            {
              contentId: "c-2",
              title: "부석사",
              address: "영주시",
              firstImage: "",
            },
          ],
        },
      });

    const result = await getContents({
      regions: ["HADONG", "YEONGJU"],
      startDate: "2026-08-01",
      nights: 1,
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=1",
    );
    expect(result.total).toBe(3);
    expect(result.contents).toEqual([
      {
        id: "c-1",
        name: "쌍계사",
        region: "HADONG",
        category: "CULTURE",
        imageUrl: "https://example.com/1.jpg",
        address: "하동군",
        summary: "천년 고찰",
        indoor: true,
      },
      {
        id: "c-2",
        name: "부석사",
        region: "YEONGJU",
        category: undefined,
        imageUrl: null,
        address: "영주시",
        summary: undefined,
        indoor: undefined,
      },
    ]);
  });

  it("companions가 있으면 쿼리에 콤마로 이어 붙인다", async () => {
    mockGet.mockResolvedValueOnce({ data: { totalCount: 0, items: [] } });

    await getContents({
      regions: ["HADONG"],
      startDate: "2026-08-01",
      nights: 2,
      companions: ["FAMILY", "PET"],
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=2&companions=FAMILY%2CPET",
    );
  });

  it("API가 오류를 반환하면 그대로 throw한다", async () => {
    mockGet.mockRejectedValueOnce(new ApiError(404, "Not Found"));

    await expect(
      getContents({ regions: ["HADONG"], startDate: "2026-06-20", nights: 0 }),
    ).rejects.toThrow("Not Found");
  });
});

describe("getContentById (apiClient 이관)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/contents/{id}를 호출하고 백엔드 응답을 ContentDetail 계약으로 변환한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        contentId: "c-1",
        title: "쌍계사",
        address: "하동군",
        summary: "천년 고찰",
        useTime: "상시 개방",
        restDate: "연중무휴",
        parking: "불가능",
        stayDuration: "약 2시간",
        reservationRequired: false,
        dataSource: "TourAPI",
        images: [
          { imageUrl: "https://example.com/1.jpg", title: "1" },
          { imageUrl: "https://example.com/2.jpg", title: "2" },
        ],
        category: "CULTURE",
        indoor: true,
        region: "HADONG",
      },
    });

    const result = await getContentById("c-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/contents/c-1");
    expect(result).toEqual({
      id: "c-1",
      name: "쌍계사",
      region: "HADONG",
      category: "CULTURE",
      imageUrl: "https://example.com/1.jpg",
      address: "하동군",
      summary: "천년 고찰",
      indoor: true,
      operatingHours: "상시 개방",
      closedDay: "연중무휴",
      parking: false,
      stayDuration: "약 2시간",
      reservationRequired: false,
      dataSource: "TourAPI",
      imageUrls: ["https://example.com/2.jpg"],
    });
  });

  it("parking에 '불가'가 없으면 true로 변환한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        contentId: "c-1",
        title: "쌍계사",
        address: "하동군",
        summary: "천년 고찰",
        useTime: null,
        restDate: null,
        parking: "가능",
        stayDuration: null,
        reservationRequired: null,
        dataSource: null,
        images: [],
        region: "HADONG",
      },
    });

    const result = await getContentById("c-1");

    expect(result.parking).toBe(true);
    expect(result.imageUrl).toBeNull();
    expect(result.imageUrls).toEqual([]);
  });

  it("parking이 없으면 null로 변환한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        contentId: "c-1",
        title: "쌍계사",
        address: "하동군",
        summary: "천년 고찰",
        useTime: null,
        restDate: null,
        parking: null,
        stayDuration: null,
        reservationRequired: null,
        dataSource: null,
        images: [],
        region: "HADONG",
      },
    });

    const result = await getContentById("c-1");

    expect(result.parking).toBeNull();
  });

  it("API가 오류를 반환하면 그대로 throw한다", async () => {
    mockGet.mockRejectedValueOnce(new ApiError(404, "Not Found"));

    await expect(getContentById("999")).rejects.toThrow("Not Found");
  });
});
