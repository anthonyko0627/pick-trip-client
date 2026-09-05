import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import * as itineraryServiceModule from "@/services/itineraryService";
import { useItineraryMapSnapshotStore } from "@/stores/itineraryMapSnapshotStore";
import { useSavedItinerariesStore } from "@/stores/savedItinerariesStore";
import type {
  ItineraryResponse,
  SavedItinerarySummary,
} from "@/types/itinerary";
import type { ItineraryMapSnapshot } from "@/types/map";
import { SavedItinerariesList } from "./SavedItinerariesList";

vi.mock("@/services/itineraryService");

// 저장된 일정 조회 시 ItineraryResult가 지도 데이터를 라이브 해석하지 않게 막는다.
vi.mock("@/hooks/useItineraryMapData", () => ({
  useItineraryMapData: () => ({ status: "ready", days: [] }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    runAuthed: (fn: (token?: string) => Promise<unknown>) =>
      fn("access-token-1"),
  }),
}));

const STORAGE_KEY = "pick-trip-saved-itineraries";

function seedSaved(items: SavedItinerarySummary[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

const summary: SavedItinerarySummary = {
  itineraryId: "itinerary-1",
  title: "하동 1박 2일 여행",
  region: "HADONG",
  travelDate: "2026-08-01",
  duration: 1,
  savedAt: 1000,
};

const detailResponse: ItineraryResponse = {
  itineraryId: "itinerary-1",
  title: "하동 1박 2일 여행",
  region: "HADONG",
  travelDate: "2026-08-01",
  duration: 1,
  lastModifiedAt: "2026-08-01T00:00:00Z",
  days: [
    {
      dayId: "day-1",
      dayIndex: 0,
      items: [
        {
          itemId: "item-1",
          contentId: "content-1",
          title: "쌍계사",
          order: 0,
          reason: "지역 대표 명소",
          pinned: false,
        },
      ],
    },
  ],
};

describe("SavedItinerariesList", () => {
  const mockGetItinerary = vi.mocked(itineraryServiceModule.getItinerary);

  beforeEach(() => {
    localStorage.clear();
    // 전역 Zustand 스토어는 테스트 간 유지되므로, 매 테스트마다 초기화해
    // hydrated 플래그로 인해 새 시드가 무시되는 것을 막는다.
    useSavedItinerariesStore.setState({ items: [], hydrated: false });
    useItineraryMapSnapshotStore.setState({ snapshots: {}, hydrated: true });
    vi.clearAllMocks();
  });

  it("저장한 일정이 없으면 빈 상태 문구를 표시한다", () => {
    render(<SavedItinerariesList />);

    expect(screen.getByText("아직 저장한 일정이 없습니다")).toBeInTheDocument();
  });

  it("저장한 일정 요약을 목록으로 표시한다", async () => {
    seedSaved([summary]);
    render(<SavedItinerariesList />);

    expect(await screen.findByText("하동 1박 2일 여행")).toBeInTheDocument();
    expect(screen.getByText("2026-08-01")).toBeInTheDocument();
    expect(screen.getAllByText("1박 2일").length).toBeGreaterThan(0);
  });

  it("'보기' 클릭 시 상세를 지연 조회해 펼친다", async () => {
    seedSaved([summary]);
    mockGetItinerary.mockResolvedValue(detailResponse);

    render(<SavedItinerariesList />);
    await userEvent.click(await screen.findByRole("button", { name: "보기" }));

    expect(mockGetItinerary).toHaveBeenCalledWith(
      "itinerary-1",
      "access-token-1",
    );
    expect(await screen.findByText("쌍계사")).toBeInTheDocument();
  });

  it("'보기'로 펼친 영역의 '생성된 일정' 옆에 공유하기 버튼을 보여준다", async () => {
    seedSaved([summary]);
    mockGetItinerary.mockResolvedValue(detailResponse);

    render(<SavedItinerariesList />);
    await userEvent.click(await screen.findByRole("button", { name: "보기" }));
    await screen.findByText("쌍계사");

    expect(
      screen.getByRole("button", { name: "공유하기" }),
    ).toBeInTheDocument();
  });

  it("같은 항목을 다시 '보기' 클릭해도 재조회하지 않는다", async () => {
    seedSaved([summary]);
    mockGetItinerary.mockResolvedValue(detailResponse);

    render(<SavedItinerariesList />);
    await userEvent.click(await screen.findByRole("button", { name: "보기" }));
    await screen.findByText("쌍계사");

    await userEvent.click(screen.getByRole("button", { name: "접기" }));
    await userEvent.click(screen.getByRole("button", { name: "보기" }));

    expect(mockGetItinerary).toHaveBeenCalledTimes(1);
  });

  it("상세 조회 실패 시 에러 메시지와 재시도 버튼을 표시한다", async () => {
    seedSaved([summary]);
    mockGetItinerary.mockRejectedValue(
      new ApiError(404, "일정을 찾을 수 없습니다.", "ITINERARY_NOT_FOUND"),
    );

    render(<SavedItinerariesList />);
    await userEvent.click(await screen.findByRole("button", { name: "보기" }));

    expect(
      await screen.findByText("일정을 찾을 수 없습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
  });

  it("펼친 행에 route가 있는 스냅샷이 있으면 전체 장소 수·이동 거리 메타를 보여준다", async () => {
    seedSaved([summary]);
    mockGetItinerary.mockResolvedValue(detailResponse);
    const snapshot: ItineraryMapSnapshot = {
      v: 1,
      savedAt: Date.now(),
      days: [
        {
          dayIndex: 0,
          points: [
            { lat: 35.1, lng: 127.7, contentId: "content-1", title: "쌍계사" },
          ],
          route: {
            totalDistanceMeters: 8300,
            totalDurationSeconds: 1200,
            segments: [],
            path: [],
          },
        },
      ],
    };

    render(<SavedItinerariesList />);
    // 목록이 먼저 hydrate 되게 기다린다 — useItineraryMapSnapshots의 pruneTo가
    // items 목록보다 먼저(빈 배열로) 실행되면 아래에서 세팅할 스냅샷을 곧장
    // 지워버리기 때문에, hydrate가 끝난 뒤에 스냅샷을 세팅한다.
    await screen.findByText("하동 1박 2일 여행");
    act(() => {
      useItineraryMapSnapshotStore.setState({
        snapshots: { "itinerary-1": snapshot },
        hydrated: true,
      });
    });

    await userEvent.click(await screen.findByRole("button", { name: "보기" }));
    await screen.findByText("쌍계사");

    expect(screen.getByText("1곳 · 8.3km")).toBeInTheDocument();
  });

  it("스냅샷이 없으면 전체 장소 수·이동 거리 메타를 보여주지 않는다", async () => {
    seedSaved([summary]);
    mockGetItinerary.mockResolvedValue(detailResponse);

    render(<SavedItinerariesList />);
    await userEvent.click(await screen.findByRole("button", { name: "보기" }));
    await screen.findByText("쌍계사");

    expect(screen.queryByText(/곳 · .*km/)).not.toBeInTheDocument();
  });

  it("'목록에서 지우기' 클릭 시 항목이 목록에서 사라진다", async () => {
    seedSaved([summary]);
    render(<SavedItinerariesList />);

    await screen.findByText("하동 1박 2일 여행");
    await userEvent.click(
      screen.getByRole("button", { name: "목록에서 지우기" }),
    );

    expect(screen.getByText("아직 저장한 일정이 없습니다")).toBeInTheDocument();
  });
});
