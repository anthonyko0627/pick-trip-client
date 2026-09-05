import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as contentServiceModule from "@/services/contentService";
import { installKakaoMock, uninstallKakaoMock } from "@/test/kakaoMapMock";
import type { Day } from "@/types/itinerary";
import { ItineraryResult } from "./ItineraryResult";

vi.mock("@/services/contentService");

// 지도 데이터 해석은 별도 훅 테스트에서 검증한다. 여기서는 비활성으로 둔다.
vi.mock("@/hooks/useItineraryMapData", () => ({
  useItineraryMapData: () => ({ status: "ready", days: [] }),
}));

// hideMap=false(standalone)에서 route가 있는 mapData를 넘기면 DayMapPanel이
// 실제 ItineraryMap을 그리므로 카카오 SDK를 모킹해둔다.
vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => Promise.resolve(),
}));

const makeDay = (overrides: Partial<Day> = {}): Day => ({
  dayId: "day-1",
  dayIndex: 1,
  items: [
    {
      itemId: "item-1",
      contentId: "content-1",
      title: "쌍계사",
      order: 0,
      reason: "",
      pinned: false,
    },
  ],
  ...overrides,
});

describe("ItineraryResult", () => {
  beforeEach(() => {
    installKakaoMock();
  });
  afterEach(() => {
    uninstallKakaoMock();
  });

  it("선택한 일차 하나만 카드로 렌더하고, 지도(카드 내부)는 없다", () => {
    render(
      <ItineraryResult
        data={{
          days: [
            makeDay({ dayIndex: 1 }),
            makeDay({ dayId: "day-2", dayIndex: 2 }),
          ],
        }}
      />,
    );

    // 일차 카드 헤딩(h3)은 선택된 1개뿐 — "생성된 일정" h2도 사라졌다.
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("1일차");
  });

  it("탭을 클릭하면 다른 일차 카드로 전환한다", async () => {
    render(
      <ItineraryResult
        data={{
          days: [
            makeDay({ dayIndex: 1 }),
            makeDay({ dayId: "day-2", dayIndex: 2 }),
          ],
        }}
      />,
    );

    expect(screen.getByRole("heading")).toHaveTextContent("1일차");

    await userEvent.click(screen.getAllByRole("tab")[1]);

    expect(screen.getByRole("heading")).toHaveTextContent("2일차");
  });

  it("일자가 없으면 빈 상태 메시지를 표시한다", () => {
    render(<ItineraryResult data={{ days: [] }} />);

    expect(screen.getByText("생성된 일정이 없습니다")).toBeInTheDocument();
  });

  it("editor가 없으면 편집 컨트롤과 저장 버튼을 렌더하지 않는다", () => {
    render(<ItineraryResult data={{ days: [makeDay()] }} />);

    expect(
      screen.queryByRole("button", { name: /변경사항 저장/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "위로 이동" }),
    ).not.toBeInTheDocument();
  });

  it("adjustments가 있으면 조정 안내 배너를 렌더한다", () => {
    render(
      <ItineraryResult
        data={{
          days: [makeDay()],
          adjustments: ["'쌍계사'는 1일차(수)에 휴무여서 2일차로 옮겼습니다."],
        }}
      />,
    );

    expect(
      screen.getByText("AI가 일정을 이렇게 조정했어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("'쌍계사'는 1일차(수)에 휴무여서 2일차로 옮겼습니다."),
    ).toBeInTheDocument();
  });

  it("adjustments가 없거나 비면 배너를 렌더하지 않는다", () => {
    render(<ItineraryResult data={{ days: [makeDay()], adjustments: [] }} />);

    expect(
      screen.queryByText("AI가 일정을 이렇게 조정했어요"),
    ).not.toBeInTheDocument();
  });

  it("hideAdjustments면 adjustments가 있어도 배너를 렌더하지 않는다", () => {
    render(
      <ItineraryResult
        data={{ days: [makeDay()], adjustments: ["휴무여서 옮겼습니다."] }}
        hideAdjustments
      />,
    );

    expect(
      screen.queryByText("AI가 일정을 이렇게 조정했어요"),
    ).not.toBeInTheDocument();
  });

  const mapDataWithRoute = {
    days: [
      {
        dayIndex: 1,
        points: [
          {
            lat: 35.1,
            lng: 127.7,
            contentId: "content-1",
            title: "쌍계사",
          },
        ],
        route: {
          totalDistanceMeters: 5000,
          totalDurationSeconds: 600,
          segments: [],
          path: [],
        },
      },
    ],
  };

  it("실도로 경로가 잡힌 날이 있으면 이동값 기준 안내문을 보여준다", () => {
    render(
      <ItineraryResult
        data={{ days: [makeDay()] }}
        mapData={mapDataWithRoute}
      />,
    );

    expect(
      screen.getByText(/카카오 모빌리티 자동차 길찾기 실제 도로/),
    ).toBeInTheDocument();
  });

  it("경로 데이터가 없으면 이동값 안내문을 보여주지 않는다", () => {
    render(<ItineraryResult data={{ days: [makeDay()] }} />);

    expect(
      screen.queryByText(/카카오 모빌리티 자동차 길찾기 실제 도로/),
    ).not.toBeInTheDocument();
  });

  it("hideMap이면 경로가 있어도 이동값 안내문을 렌더하지 않는다(호출부가 지도 옆에 둔다)", () => {
    render(
      <ItineraryResult
        data={{ days: [makeDay()] }}
        hideMap
        mapData={mapDataWithRoute}
      />,
    );

    expect(
      screen.queryByText(/카카오 모빌리티 자동차 길찾기 실제 도로/),
    ).not.toBeInTheDocument();
  });

  it("장소가 없는 날이 있으면 편집기 저장 버튼이 비활성화되고 안내가 뜬다", () => {
    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({ isDirty: true, days: [makeDay({ items: [] })] })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "변경사항 저장" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/장소가 없는 날이 있어 저장할 수 없어요/),
    ).toBeInTheDocument();
  });

  const makeEditor = (
    overrides: Partial<Parameters<typeof ItineraryResult>[0]["editor"]> = {},
  ) => ({
    region: "HADONG" as const,
    travelDate: "2026-08-01",
    duration: 1,
    days: [makeDay()],
    isDirty: false,
    isSaving: false,
    saveError: null,
    onMoveItem: vi.fn(),
    onRemoveItem: vi.fn(),
    onTogglePinned: vi.fn(),
    onReplaceItem: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  });

  it("editor가 있으면 editor.days를 렌더하고 isDirty=false면 저장 버튼이 비활성화된다", () => {
    render(<ItineraryResult data={{ days: [] }} editor={makeEditor()} />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "변경사항 저장" }),
    ).toBeDisabled();
  });

  it("isDirty=true이면 저장 버튼이 활성화되고 클릭 시 onSave를 호출한다", async () => {
    const onSave = vi.fn();
    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({ isDirty: true, onSave })}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "변경사항 저장" });
    expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("saveError가 있으면 에러 메시지를 표시한다", () => {
    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({
          saveError: { message: "저장에 실패했습니다.", traceId: "t-1" },
        })}
      />,
    );

    expect(screen.getByText(/저장에 실패했습니다\./)).toBeInTheDocument();
    expect(screen.getByText(/t-1/)).toBeInTheDocument();
  });

  it("대체 장소 버튼 클릭 시 피커를 열고, 선택하면 onReplaceItem을 호출한다", async () => {
    const mockGetContents = vi.mocked(contentServiceModule.getContents);
    mockGetContents.mockResolvedValue({
      contents: [
        {
          id: "content-3",
          name: "화개장터",
          region: "HADONG",
          imageUrl: null,
          address: "경남 하동군 화개면",
        },
      ],
      total: 1,
    });
    const onReplaceItem = vi.fn();

    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({ onReplaceItem })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "대체 장소" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "이 장소로 교체" }),
    );

    expect(onReplaceItem).toHaveBeenCalledWith(
      "day-1",
      "item-1",
      expect.objectContaining({ id: "content-3" }),
    );
  });
});
