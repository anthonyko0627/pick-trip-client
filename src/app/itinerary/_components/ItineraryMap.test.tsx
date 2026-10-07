import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  installKakaoMock,
  type KakaoMockInstances,
  uninstallKakaoMock,
} from "@/test/kakaoMapMock";
import type { ItineraryMapDay } from "@/types/map";

const loadKakaoMaps = vi.fn(() => Promise.resolve());
vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => loadKakaoMaps(),
  onKakaoMapsLateReady: () => () => {},
}));

import { ItineraryMap } from "./ItineraryMap";

let instances: KakaoMockInstances;

const mapDay = (
  dayIndex: number,
  pointCount: number,
  route: ItineraryMapDay["route"] = null,
): ItineraryMapDay => ({
  dayIndex,
  points: Array.from({ length: pointCount }, (_, i) => ({
    lat: 35.1 + i * 0.01,
    lng: 127.7 + i * 0.01,
    contentId: `c-${dayIndex}-${i}`,
    title: `장소 ${dayIndex}-${i}`,
  })),
  route,
});

describe("ItineraryMap", () => {
  beforeEach(() => {
    loadKakaoMaps.mockReturnValue(Promise.resolve());
    instances = installKakaoMock();
  });

  afterEach(() => {
    uninstallKakaoMock();
  });

  it("overview: 일차마다 경로선 1개와 지점마다 마커를 그리고 bounds를 맞춘다", async () => {
    render(
      <ItineraryMap variant="overview" days={[mapDay(1, 2), mapDay(2, 3)]} />,
    );

    await waitFor(() => expect(instances.maps).toHaveLength(1));
    expect(instances.polylines).toHaveLength(2);
    expect(instances.overlays).toHaveLength(5);
    expect(instances.maps[0].setBounds).toHaveBeenCalled();
  });

  it("route가 없으면 경로선을 shortdash(직선)로 그린다", async () => {
    render(<ItineraryMap variant="day" days={[mapDay(1, 3)]} />);

    await waitFor(() => expect(instances.polylines).toHaveLength(1));
    expect(instances.polylines[0].options.strokeStyle).toBe("shortdash");
  });

  it("route가 있으면 경로선을 solid로 그리고 도로 경로 정점을 쓴다", async () => {
    const route = {
      totalDistanceMeters: 4200,
      totalDurationSeconds: 600,
      segments: [{ distanceMeters: 4200, durationSeconds: 600 }],
      path: [
        [127.7, 35.1],
        [127.72, 35.12],
        [127.74, 35.13],
      ] as [number, number][],
    };
    render(<ItineraryMap variant="overview" days={[mapDay(1, 2, route)]} />);

    await waitFor(() => expect(instances.polylines).toHaveLength(1));
    expect(instances.polylines[0].options.strokeStyle).toBe("solid");
    // overview 지도에는 이동 요약 캡션을 보여준다.
    expect(screen.getByText(/이동/)).toBeInTheDocument();
  });

  it("일차 지도에는 캡션을 넣지 않는다(DayCard 헤더 칩과 중복)", async () => {
    render(<ItineraryMap variant="day" days={[mapDay(1, 3)]} />);

    await waitFor(() => expect(instances.polylines).toHaveLength(1));
    expect(screen.queryByText(/직선거리|이동/)).not.toBeInTheDocument();
  });

  // 장소명 라벨 div 는 border-radius:7px 로 식별한다(title 속성은 항상 있으므로).
  const hasLabel = (content: unknown) =>
    String(content).includes("border-radius:7px");

  it("day 뷰: 마커에 장소명 라벨을 붙이고, overview 뷰는 번호만 쓴다", async () => {
    const { unmount } = render(
      <ItineraryMap variant="day" days={[mapDay(1, 2)]} />,
    );
    await waitFor(() => expect(instances.overlays).toHaveLength(2));
    expect(hasLabel(instances.overlays[0].options.content)).toBe(true);
    expect(String(instances.overlays[0].options.content)).toContain("장소 1-0");
    unmount();
    uninstallKakaoMock();
    instances = installKakaoMock();

    render(<ItineraryMap variant="overview" days={[mapDay(1, 2)]} />);
    await waitFor(() => expect(instances.overlays).toHaveLength(2));
    expect(hasLabel(instances.overlays[0].options.content)).toBe(false);
  });

  it("day 뷰: 화면상 가까운 마커는 라벨을 숨긴다", async () => {
    const day: ItineraryMapDay = {
      dayIndex: 1,
      points: [
        { lat: 35.1, lng: 127.7, contentId: "a", title: "가까운앞" },
        { lat: 35.1001, lng: 127.7001, contentId: "b", title: "가까운뒤" },
      ],
      route: null,
    };
    render(<ItineraryMap variant="day" days={[day]} />);
    await waitFor(() => expect(instances.overlays).toHaveLength(2));
    expect(hasLabel(instances.overlays[0].options.content)).toBe(true);
    expect(hasLabel(instances.overlays[1].options.content)).toBe(false);
  });

  it("좌표가 있는 장소가 없으면 안내 문구를 보이고 마커를 그리지 않는다", async () => {
    render(<ItineraryMap variant="day" days={[mapDay(1, 0)]} />);

    await waitFor(() =>
      expect(
        screen.getByText("위치 정보가 있는 장소가 없어요"),
      ).toBeInTheDocument(),
    );
    expect(instances.overlays).toHaveLength(0);
  });

  it("확대 상태에서 day를 바꾸고 축소하면 옛 day의 구도가 아니라 현재 day 기준으로 다시 맞춘다", async () => {
    const day1 = mapDay(1, 2);
    const day2 = mapDay(2, 3);

    const { rerender } = render(
      <ItineraryMap variant="day" days={[day1]} resetViewKey={false} />,
    );
    await waitFor(() => expect(instances.maps).toHaveLength(1));
    const map = instances.maps[0];

    // 확대: day1 그대로, resetViewKey만 켠다.
    rerender(<ItineraryMap variant="day" days={[day1]} resetViewKey={true} />);
    await waitFor(() => expect(map.relayout).toHaveBeenCalledTimes(1));

    // 확대 상태에서 다른 day로 전환 — 넓은 박스 기준으로 fit된다.
    rerender(<ItineraryMap variant="day" days={[day2]} resetViewKey={true} />);
    await waitFor(() => expect(map.setBounds).toHaveBeenCalled());
    map.setBounds.mockClear();

    // 축소: resetViewKey를 끈다. day1 시절 스냅샷이 아니라 지금 선택된
    // day2 기준으로 다시 맞춰야 한다.
    rerender(<ItineraryMap variant="day" days={[day2]} resetViewKey={false} />);
    await waitFor(() => expect(map.relayout).toHaveBeenCalledTimes(2));

    expect(map.setBounds).toHaveBeenCalledTimes(1);
    const bounds = map.setBounds.mock.calls[0][0] as { points: unknown[] };
    // day1은 점이 2개, day2는 3개 — day2 기준으로 다시 fit됐는지 구분한다.
    expect(bounds.points).toHaveLength(3);
  });

  it("SDK 로드에 실패하면 에러 문구를 보인다", async () => {
    loadKakaoMaps.mockReturnValue(Promise.reject(new Error("fail")));
    render(<ItineraryMap variant="day" days={[mapDay(1, 2)]} />);

    await waitFor(() =>
      expect(screen.getByText("지도를 불러오지 못했어요")).toBeInTheDocument(),
    );
  });
});
