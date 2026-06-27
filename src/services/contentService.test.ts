import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getContentById, getContents } from "./contentService";

const BASE_URL = "http://localhost:8080";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", BASE_URL);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getContents", () => {
  it("regions를 쿼리 파라미터로 포함해 API를 호출한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ contents: [], total: 0 }), {
        status: 200,
      }),
    );

    await getContents({
      regions: ["HADONG", "YEONGJU"],
      startDate: "2026-06-20",
      nights: 1,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("regions=HADONG%2CYEONGJU"),
      expect.any(Object),
    );
  });

  it("성공 응답을 ContentsResponse 형태로 반환한다", async () => {
    const mockContent = {
      id: "1",
      name: "쌍계사",
      region: "HADONG",
      category: "CULTURE",
      imageUrl: null,
      address: "경남 하동군",
      summary: "천년 고찰",
      indoor: false,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ contents: [mockContent], total: 1 }), {
        status: 200,
      }),
    );

    const result = await getContents({
      regions: ["HADONG"],
      startDate: "2026-06-20",
      nights: 0,
    });

    expect(result.total).toBe(1);
    expect(result.contents[0].name).toBe("쌍계사");
  });

  it("API가 4xx를 반환하면 에러를 throw한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }),
    );

    await expect(
      getContents({ regions: ["HADONG"], startDate: "2026-06-20", nights: 0 }),
    ).rejects.toThrow();
  });
});

describe("getContentById", () => {
  it("콘텐츠 ID로 올바른 경로에 API를 호출한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "42",
          name: "쌍계사",
          region: "HADONG",
          category: "CULTURE",
          imageUrl: null,
          address: "경남 하동군",
          summary: "천년 고찰",
          indoor: false,
          operatingHours: null,
          closedDay: null,
          parking: null,
          stayDuration: null,
          reservationRequired: null,
          dataSource: null,
          imageUrls: [],
        }),
        { status: 200 },
      ),
    );

    await getContentById("42");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/contents/42"),
      expect.any(Object),
    );
  });

  it("성공 응답을 ContentDetail 형태로 반환한다", async () => {
    const mockDetail = {
      id: "1",
      name: "쌍계사",
      region: "HADONG",
      category: "CULTURE",
      imageUrl: null,
      address: "경남 하동군",
      summary: "천년 고찰",
      indoor: false,
      operatingHours: "09:00 - 18:00",
      closedDay: "연중무휴",
      parking: true,
      stayDuration: "1시간",
      reservationRequired: false,
      dataSource: "한국관광공사",
      imageUrls: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockDetail), { status: 200 }),
    );

    const result = await getContentById("1");

    expect(result.operatingHours).toBe("09:00 - 18:00");
    expect(result.parking).toBe(true);
    expect(result.dataSource).toBe("한국관광공사");
  });

  it("API가 4xx를 반환하면 에러를 throw한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }),
    );

    await expect(getContentById("999")).rejects.toThrow();
  });
});
