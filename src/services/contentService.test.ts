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
  it("region을 단수 파라미터로 포함해 API를 호출한다", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ totalCount: 0, items: [] }), {
        status: 200,
      }),
    );

    await getContents({
      regions: ["HADONG"],
      startDate: "2026-06-20",
      nights: 1,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("region=HADONG"),
      expect.any(Object),
    );
  });

  it("선택된 지역마다 따로 호출해 결과를 합친다", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            totalCount: 1,
            items: [
              {
                contentId: "1",
                title: "쌍계사",
                address: "경남 하동군",
                firstImage: "",
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            totalCount: 1,
            items: [
              {
                contentId: "2",
                title: "소수서원",
                address: "경북 영주시",
                firstImage: "",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await getContents({
      regions: ["HADONG", "YEONGJU"],
      startDate: "2026-06-20",
      nights: 1,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(2);
    expect(result.contents.map((c) => c.name)).toEqual(["쌍계사", "소수서원"]);
    expect(result.contents[0].region).toBe("HADONG");
    expect(result.contents[1].region).toBe("YEONGJU");
  });

  it("성공 응답을 ContentsResponse 형태로 매핑해 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          totalCount: 1,
          items: [
            {
              contentId: "1",
              title: "쌍계사",
              address: "경남 하동군",
              firstImage: "",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getContents({
      regions: ["HADONG"],
      startDate: "2026-06-20",
      nights: 0,
    });

    expect(result.total).toBe(1);
    expect(result.contents[0]).toEqual({
      id: "1",
      name: "쌍계사",
      region: "HADONG",
      imageUrl: null,
      address: "경남 하동군",
    });
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
