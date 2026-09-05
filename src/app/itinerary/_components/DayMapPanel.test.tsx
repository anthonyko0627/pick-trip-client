import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installKakaoMock, uninstallKakaoMock } from "@/test/kakaoMapMock";
import type { Day } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";

vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => Promise.resolve(),
}));

import { DayMapPanel } from "./DayMapPanel";

const day = (overrides: Partial<Day> = {}): Day => ({
  dayId: "d1",
  dayIndex: 1,
  items: [
    {
      itemId: "i1",
      contentId: "c1",
      title: "A",
      order: 0,
      reason: "",
      pinned: false,
    },
    {
      itemId: "i2",
      contentId: "c2",
      title: "B",
      order: 1,
      reason: "",
      pinned: false,
    },
  ],
  totalTravelMinutes: 30,
  totalTravelKm: 12,
  ...overrides,
});

const mapData = (
  route: ItineraryMapData["days"][number]["route"] = null,
): ItineraryMapData => ({
  days: [
    {
      dayIndex: 1,
      points: [
        { lat: 35.1, lng: 127.7, contentId: "c1", title: "A" },
        { lat: 35.2, lng: 127.8, contentId: "c2", title: "B" },
      ],
      route,
    },
  ],
});

describe("DayMapPanel", () => {
  beforeEach(() => {
    installKakaoMock();
  });
  afterEach(() => {
    uninstallKakaoMock();
  });

  it("좌표가 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(
      <DayMapPanel
        days={[day()]}
        mapData={{ days: [] }}
        selectedDayIndex={0}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("구간 헤더행에 '{n}일차 구간'과 이동 합계를 보여준다", () => {
    render(
      <DayMapPanel
        days={[day()]}
        mapData={mapData({
          totalDistanceMeters: 8300,
          totalDurationSeconds: 1200,
          segments: [{ distanceMeters: 8300, durationSeconds: 1200 }],
          path: [],
        })}
        selectedDayIndex={0}
      />,
    );

    const header = screen.getByText("1일차 구간");
    expect(header).toBeInTheDocument();
    expect(header.nextElementSibling).toHaveTextContent("20분 · 8.3km");
  });

  it("route가 없으면 백엔드 이동 합계로 폴백한다", () => {
    render(
      <DayMapPanel days={[day()]} mapData={mapData()} selectedDayIndex={0} />,
    );

    expect(screen.getByText("30분 · 12km")).toBeInTheDocument();
  });

  it("카카오맵 링크를 마지막 지점 기준으로 만든다", () => {
    render(
      <DayMapPanel days={[day()]} mapData={mapData()} selectedDayIndex={0} />,
    );

    const link = screen.getByRole("link", { name: /카카오맵에서 경로 열기/ });
    expect(link).toHaveAttribute(
      "href",
      "https://map.kakao.com/link/to/B,35.2,127.8",
    );
  });

  it("지도 위 요약 배지에 일차와 장소 수를 보여준다", () => {
    render(
      <DayMapPanel
        days={[day()]}
        mapData={mapData({
          totalDistanceMeters: 8300,
          totalDurationSeconds: 1200,
          segments: [{ distanceMeters: 8300, durationSeconds: 1200 }],
          path: [],
        })}
        selectedDayIndex={0}
      />,
    );

    expect(screen.getByText("1일차")).toBeInTheDocument();
    expect(screen.getByText("2곳 · 20분 · 8.3km")).toBeInTheDocument();
  });

  it("이동 요약이 없어도 배지에 '·'로 끝나는 빈 값이 남지 않는다", () => {
    render(
      <DayMapPanel
        days={[day({ totalTravelMinutes: null, totalTravelKm: null })]}
        mapData={mapData()}
        selectedDayIndex={0}
      />,
    );

    expect(screen.getByText("2곳")).toBeInTheDocument();
  });

  it("요약 배지에 pointer-events-none이 걸려 있다", () => {
    const { container } = render(
      <DayMapPanel days={[day()]} mapData={mapData()} selectedDayIndex={0} />,
    );

    const badge = screen.getByText("1일차").closest("div.pointer-events-none");
    expect(badge).not.toBeNull();
    expect(container.querySelector(".pointer-events-none")).toBe(badge);
  });
});
