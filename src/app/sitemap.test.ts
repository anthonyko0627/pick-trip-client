import { describe, expect, it, vi } from "vitest";

import { getContents } from "@/services/contentService";
import type { Content } from "@/types/content";

import sitemap from "./sitemap";

vi.mock("@/services/contentService", () => ({
  getContents: vi.fn(),
}));

const mockGetContents = vi.mocked(getContents);

function content(id: string): Content {
  return {
    id,
    name: `콘텐츠 ${id}`,
    region: "HADONG",
    imageUrl: null,
    address: "하동군",
  };
}

const STATIC_URLS = [
  "https://www.pick-trip.app/",
  "https://www.pick-trip.app/account-deletion",
  "https://www.pick-trip.app/contents",
  "https://www.pick-trip.app/explore",
  "https://www.pick-trip.app/privacy",
  "https://www.pick-trip.app/terms",
];

describe("sitemap", () => {
  it("정적 공개 라우트와 콘텐츠 상세 URL을 함께 반환한다", async () => {
    mockGetContents.mockResolvedValueOnce({
      contents: [content("c-1")],
      total: 1,
    });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual([
      ...STATIC_URLS,
      "https://www.pick-trip.app/contents/c-1",
    ]);
  });

  it("총 개수에 도달할 때까지 다음 페이지를 이어서 가져온다", async () => {
    mockGetContents
      .mockResolvedValueOnce({ contents: [content("c-1")], total: 2 })
      .mockResolvedValueOnce({ contents: [content("c-2")], total: 2 });

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(mockGetContents).toHaveBeenCalledTimes(2);
    expect(mockGetContents.mock.calls[1]?.[0].page).toBe(1);
    expect(urls).toContain("https://www.pick-trip.app/contents/c-2");
  });

  it("콘텐츠 조회가 실패해도 정적 공개 라우트는 반환한다", async () => {
    mockGetContents.mockRejectedValueOnce(new Error("network down"));

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual(STATIC_URLS);
  });

  it("인증·개인화 라우트는 포함하지 않는다", async () => {
    mockGetContents.mockResolvedValueOnce({ contents: [], total: 0 });

    const urls = (await sitemap()).map((entry) => entry.url);

    for (const path of [
      "/dashboard",
      "/favorites",
      "/itineraries",
      "/mypage",
    ]) {
      expect(urls.some((url) => url.includes(path))).toBe(false);
    }
  });
});
