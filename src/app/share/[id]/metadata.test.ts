import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSharedItinerary } from "@/services/shareService";
import type { SharedItineraryResponse } from "@/types/itinerary";

import { generateMetadata } from "./page";

vi.mock("@/services/shareService", () => ({
  getSharedItinerary: vi.fn(),
}));

const mockGetShared = vi.mocked(getSharedItinerary);

const shared: SharedItineraryResponse = {
  title: "하동 1박 2일",
  region: "HADONG",
  travelDate: "2026-10-10",
  duration: 1,
  days: [
    {
      dayId: "day-1",
      dayIndex: 1,
      items: [
        {
          itemId: "item-1",
          contentId: "c-1",
          title: "최참판댁",
          order: 0,
          reason: "대표 관광지",
          pinned: false,
        },
      ],
    },
  ],
};

beforeEach(() => {
  mockGetShared.mockReset();
});

describe("공유 페이지 generateMetadata", () => {
  it("검색 비노출(noindex)로 응답하되 제목·설명은 유지한다", async () => {
    mockGetShared.mockResolvedValueOnce(shared);

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "token-1" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("하동 1박 2일");
    expect(metadata.description).toContain("하동");
  });

  it("만료·오류 링크에서도 noindex를 유지한다", async () => {
    mockGetShared.mockRejectedValueOnce(new Error("expired"));

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "token-1" }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toBe("공유된 일정");
  });
});
