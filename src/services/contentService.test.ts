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
        imageUrl: "https://example.com/1.jpg",
        address: "하동군",
      },
      {
        id: "c-2",
        name: "부석사",
        region: "YEONGJU",
        imageUrl: null,
        address: "영주시",
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

  it("GET /api/v1/contents/{id}를 호출하고 응답을 그대로 반환한다", async () => {
    const detail = { id: "c-1", name: "쌍계사" };
    mockGet.mockResolvedValueOnce({ data: detail });

    const result = await getContentById("c-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/contents/c-1");
    expect(result).toEqual(detail);
  });

  it("API가 오류를 반환하면 그대로 throw한다", async () => {
    mockGet.mockRejectedValueOnce(new ApiError(404, "Not Found"));

    await expect(getContentById("999")).rejects.toThrow("Not Found");
  });
});
