import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installKakaoMock, uninstallKakaoMock } from "@/test/kakaoMapMock";
import type { ItineraryResponse } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";

vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => Promise.resolve(),
}));

const useItineraryMapData = vi.fn(
  (): ItineraryMapData => ({ status: "ready", days: [] }),
);
vi.mock("@/hooks/useItineraryMapData", () => ({
  useItineraryMapData: (days: unknown) => useItineraryMapData(days),
}));

// ShareButton(headerAction)이 요구하는 인증 컨텍스트를 대체한다.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    runAuthed: (fn: (token?: string) => Promise<unknown>) =>
      fn("access-token-1"),
  }),
}));

import { SavedItineraryDetail } from "./SavedItineraryDetail";

const data: ItineraryResponse = {
  itineraryId: "itinerary-1",
  title: "하동 1박 2일 일정",
  region: "HADONG",
  travelDate: "2026-09-12",
  duration: 1,
  lastModifiedAt: "2026-09-01T00:00:00Z",
  days: [
    {
      dayId: "day-1",
      dayIndex: 1,
      items: [
        {
          itemId: "item-1",
          contentId: "content-1",
          title: "화개장터",
          order: 0,
          reason: "",
          pinned: false,
        },
      ],
    },
    {
      dayId: "day-2",
      dayIndex: 2,
      items: [
        {
          itemId: "item-2",
          contentId: "content-2",
          title: "쌍계사",
          order: 0,
          reason: "",
          pinned: false,
        },
      ],
    },
  ],
};

const mapData: ItineraryMapData = {
  status: "ready",
  days: [
    {
      dayIndex: 1,
      points: [
        { lat: 35.1, lng: 127.7, contentId: "content-1", title: "화개장터" },
      ],
      route: null,
    },
    {
      dayIndex: 2,
      points: [
        { lat: 35.2, lng: 127.8, contentId: "content-2", title: "쌍계사" },
      ],
      route: null,
    },
  ],
};

describe("SavedItineraryDetail", () => {
  beforeEach(() => {
    installKakaoMock();
  });
  afterEach(() => {
    uninstallKakaoMock();
  });

  it("일차 탭을 누르면 지도 패널에 넘어가는 selectedDayIndex가 바뀐다", async () => {
    // DayCard 헤딩도 "1일차"/"2일차" 텍스트를 쓰므로, 지도 위 요약 배지
    // (.pointer-events-none)로 범위를 좁혀 확인한다.
    const { container } = render(
      <SavedItineraryDetail
        data={data}
        mapData={mapData}
        itineraryId="itinerary-1"
      />,
    );
    const badge = () => container.querySelector(".pointer-events-none");

    await waitFor(() => expect(badge()).toHaveTextContent("1일차"));

    await userEvent.click(screen.getAllByRole("tab")[1]);

    await waitFor(() => expect(badge()).toHaveTextContent("2일차"));
  });

  it("mapData(스냅샷)를 주면 useItineraryMapData가 빈 배열로 호출된다", () => {
    useItineraryMapData.mockClear();
    render(
      <SavedItineraryDetail
        data={data}
        mapData={mapData}
        itineraryId="itinerary-1"
      />,
    );

    expect(useItineraryMapData).toHaveBeenCalledWith([]);
  });

  it("mapData가 없으면 useItineraryMapData를 실제 days로 호출한다", () => {
    useItineraryMapData.mockClear();
    render(<SavedItineraryDetail data={data} itineraryId="itinerary-1" />);

    expect(useItineraryMapData).toHaveBeenCalledWith(data.days);
  });
});
