import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import { apiClient } from "./apiClient";
import {
  getContentById,
  getContents,
  getNearbyContents,
} from "./contentService";

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

  it("page/size가 주어지면 쿼리에 포함한다(더보기 페이지네이션)", async () => {
    mockGet.mockResolvedValueOnce({ data: { totalCount: 0, items: [] } });

    await getContents({
      regions: ["HADONG"],
      startDate: "2026-08-01",
      nights: 1,
      page: 1,
      size: 20,
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=1&page=1&size=20",
    );
  });

  it("여러 지역이면 size를 지역별로 쪼개 요청해 한 페이지 합계를 size로 맞춘다", async () => {
    mockGet
      .mockResolvedValueOnce({ data: { totalCount: 0, items: [] } })
      .mockResolvedValueOnce({ data: { totalCount: 0, items: [] } })
      .mockResolvedValueOnce({ data: { totalCount: 0, items: [] } });

    await getContents({
      regions: ["HADONG", "YEONGJU", "YECHEON"],
      startDate: "2026-08-01",
      nights: 0,
      page: 0,
      size: 20,
    });

    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=0&page=0&size=7",
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      2,
      "/api/v1/contents?region=YEONGJU&startDate=2026-08-01&nights=0&page=0&size=7",
    );
    expect(mockGet).toHaveBeenNthCalledWith(
      3,
      "/api/v1/contents?region=YECHEON&startDate=2026-08-01&nights=0&page=0&size=6",
    );
  });

  it("page/size가 없으면 쿼리에 포함하지 않는다(기존 동작 유지)", async () => {
    mockGet.mockResolvedValueOnce({ data: { totalCount: 0, items: [] } });

    await getContents({
      regions: ["HADONG"],
      startDate: "2026-08-01",
      nights: 1,
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=1",
    );
  });

  it("이미지·이름 오버라이드가 있는 콘텐츠는 목록에서 교체값을 쓴다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        totalCount: 1,
        items: [
          {
            contentId: "3442627", // 티카페하동 (오버라이드 대상)
            title: "하동야생차치유관 티카페하동",
            address: "하동군",
            firstImage: "http://tong.visitkorea.or.kr/old.jpg",
            category: "FOOD",
          },
        ],
      },
    });

    const { contents } = await getContents({
      regions: ["HADONG"],
      startDate: "2026-08-01",
      nights: 0,
    });

    expect(contents[0].name).toBe("티카페하동");
    expect(contents[0].imageUrl).toBe(
      "http://tong.visitkorea.or.kr/cms/resource/23/3442623_image2_1.jpg",
    );
  });

  it("영주 선비꽃이야기(2832249)는 이름과 대표 이미지를 교체한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        totalCount: 1,
        items: [
          {
            contentId: "2832249",
            title: "카페, 선비꽃",
            address: "영주시",
            firstImage: "http://tong.visitkorea.or.kr/old.jpg",
            category: "FOOD",
          },
        ],
      },
    });

    const { contents } = await getContents({
      regions: ["YEONGJU"],
      startDate: "2026-08-01",
      nights: 0,
    });

    expect(contents[0].name).toBe("선비꽃이야기");
    expect(contents[0].imageUrl).toBe(
      "http://tong.visitkorea.or.kr/cms/resource/33/2832233_image2_1.jpg",
    );
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
        latitude: 35.2345,
        longitude: 127.6789,
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
      latitude: 35.2345,
      longitude: 127.6789,
    });
  });

  it("좌표는 계약 그대로 통과시킨다 — 0(빈 값)도 보존한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        contentId: "c-9",
        title: "좌표 없는 콘텐츠",
        address: "예천군",
        summary: "요약",
        useTime: null,
        restDate: null,
        parking: null,
        stayDuration: null,
        reservationRequired: null,
        dataSource: null,
        images: [],
        region: "YECHEON",
        latitude: 0,
        longitude: 0,
      },
    });

    const result = await getContentById("c-9");

    expect(result.latitude).toBe(0);
    expect(result.longitude).toBe(0);
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

  it("이미지 오버라이드가 있으면 대표 이미지로 쓰고 원본 갤러리는 중복만 빼고 남긴다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        contentId: "2870730", // 브릿지130
        title: "브릿지130",
        address: "하동군",
        summary: "",
        useTime: null,
        restDate: null,
        parking: null,
        stayDuration: null,
        reservationRequired: null,
        dataSource: null,
        images: [
          {
            imageUrl:
              "http://tong.visitkorea.or.kr/cms/resource/12/2870712_image2_1.jpg",
            title: "1",
          },
          { imageUrl: "http://tong.visitkorea.or.kr/other.jpg", title: "2" },
        ],
        category: "FOOD",
        region: "HADONG",
      },
    });

    const result = await getContentById("2870730");

    expect(result.imageUrl).toBe(
      "http://tong.visitkorea.or.kr/cms/resource/12/2870712_image2_1.jpg",
    );
    expect(result.imageUrls).toEqual([
      "http://tong.visitkorea.or.kr/other.jpg",
    ]);
  });
});

describe("getNearbyContents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/contents/{id}/nearby를 호출하고 응답을 NearbyContentsResponse 계약으로 변환한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        originContentId: "111",
        radiusKm: 5,
        items: [
          {
            contentId: "222",
            title: "최참판댁",
            contentTypeId: "12",
            address: "하동군 악양면",
            firstImage: "https://example.com/1.jpg",
            latitude: 35.13,
            longitude: 127.57,
            category: "CULTURE",
            summary: "토지 배경",
            region: "HADONG",
            distanceKm: 1.23,
          },
        ],
      },
    });

    const result = await getNearbyContents("111");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/contents/111/nearby");
    expect(result).toEqual({
      originContentId: "111",
      radiusKm: 5,
      contents: [
        {
          id: "222",
          name: "최참판댁",
          region: "HADONG",
          category: "CULTURE",
          imageUrl: "https://example.com/1.jpg",
          address: "하동군 악양면",
          summary: "토지 배경",
          contentTypeId: "12",
          latitude: 35.13,
          longitude: 127.57,
          distanceKm: 1.23,
        },
      ],
    });
  });

  it("radiusKm·size가 주어지면 쿼리 문자열로 붙인다", async () => {
    mockGet.mockResolvedValueOnce({
      data: { originContentId: "111", radiusKm: 20, items: [] },
    });

    await getNearbyContents("111", { radiusKm: 20, size: 30 });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/contents/111/nearby?radiusKm=20&size=30",
    );
  });

  it("firstImage가 null이면 imageUrl도 null, contentTypeId가 null이면 생략한다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        originContentId: "111",
        radiusKm: 5,
        items: [
          {
            contentId: "333",
            title: "좌표만 있는 콘텐츠",
            contentTypeId: null,
            address: "하동군",
            firstImage: null,
            latitude: 35.1,
            longitude: 127.5,
            summary: null,
            region: "HADONG",
            distanceKm: 2.5,
          },
        ],
      },
    });

    const { contents } = await getNearbyContents("111");

    expect(contents[0].imageUrl).toBeNull();
    expect(contents[0].summary).toBeUndefined();
    expect(contents[0].contentTypeId).toBeUndefined();
  });

  it("이름·이미지 오버라이드 대상이면 교체값을 쓴다", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        originContentId: "111",
        radiusKm: 5,
        items: [
          {
            contentId: "3442627", // 티카페하동
            title: "하동야생차치유관 티카페하동",
            contentTypeId: "39",
            address: "하동군",
            firstImage: "http://tong.visitkorea.or.kr/old.jpg",
            latitude: 35.1,
            longitude: 127.5,
            category: "FOOD",
            region: "HADONG",
            distanceKm: 0.4,
          },
        ],
      },
    });

    const { contents } = await getNearbyContents("111");

    expect(contents[0].name).toBe("티카페하동");
    expect(contents[0].imageUrl).toBe(
      "http://tong.visitkorea.or.kr/cms/resource/23/3442623_image2_1.jpg",
    );
  });

  it("기준 콘텐츠 좌표가 없으면 백엔드가 던진 ApiError를 그대로 throw한다", async () => {
    mockGet.mockRejectedValueOnce(
      new ApiError(
        404,
        "위치 정보가 없어 주변 콘텐츠를 조회할 수 없습니다.",
        "CONTENT_LOCATION_UNKNOWN",
      ),
    );

    await expect(getNearbyContents("111")).rejects.toThrow("위치 정보가 없어");
  });
});
