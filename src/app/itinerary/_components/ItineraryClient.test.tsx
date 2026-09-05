import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import * as basketServiceModule from "@/services/basketService";
import * as itineraryServiceModule from "@/services/itineraryService";
import * as shareServiceModule from "@/services/shareService";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
} from "@/types/itinerary";
import { ItineraryClient } from "./ItineraryClient";

// useSavedItineraries.add/useBasket.clear를 테스트에서 참조하기 위해
// hoisted mock으로 선언한다.
const {
  mockAddSavedItinerary,
  mockClearBasket,
  mockSaveBasket,
  mockUseItineraryMapData,
} = vi.hoisted(() => ({
  mockAddSavedItinerary: vi.fn(),
  mockClearBasket: vi.fn(),
  mockSaveBasket: vi.fn(),
  mockUseItineraryMapData: vi.fn(),
}));

vi.mock("@/services/basketService");
vi.mock("@/services/itineraryService");
vi.mock("@/services/shareService");
// 지도 좌표/경로 해석은 별도 훅 테스트에서 검증한다. 기본은 비활성이고,
// 이동 거리 카드를 검증하는 테스트만 경로가 붙은 결과를 돌려준다.
vi.mock("@/hooks/useItineraryMapData", () => ({
  useItineraryMapData: () => mockUseItineraryMapData(),
}));
// runAuthed는 fn을 그대로 실행(토큰 없음)해 재시도 없이 최종 결과/에러를 그대로 노출한다.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    accessToken: null,
    runAuthed: (fn: (token?: string) => Promise<unknown>) => fn(undefined),
  }),
}));
// Zustand 스토어 하이드레이션 커플링을 제거하기 위해 바구니/저장 훅을 직접 mock한다.
vi.mock("@/hooks/useBasket", () => ({
  useBasket: () => ({
    items: [
      {
        content: {
          id: "content-1",
          name: "쌍계사",
          region: "HADONG",
          imageUrl: null,
          address: "경남 하동군",
        },
        addedAt: 1,
        priority: "MUST",
      },
      {
        content: {
          id: "content-2",
          name: "화개장터",
          region: "HADONG",
          imageUrl: null,
          address: "경남 하동군",
        },
        addedAt: 2,
        priority: null,
      },
    ],
    clear: mockClearBasket,
    save: mockSaveBasket,
  }),
}));
vi.mock("@/hooks/useSavedItineraries", () => ({
  useSavedItineraries: () => ({ add: mockAddSavedItinerary }),
}));

// ItineraryClient는 useMutation을 사용하므로 로컬 QueryClientProvider로 감싼다.
function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const mockGenerateResponse: ItineraryGenerateResponse = {
  title: "하동 1박 2일 여행",
  region: "HADONG",
  travelDate: "2026-08-01",
  duration: 1,
  adjustments: [],
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

const mockSavedResponse: ItineraryResponse = {
  itineraryId: "itinerary-1",
  title: mockGenerateResponse.title,
  region: mockGenerateResponse.region,
  travelDate: mockGenerateResponse.travelDate,
  duration: mockGenerateResponse.duration,
  lastModifiedAt: "2026-08-01T00:00:00Z",
  days: mockGenerateResponse.days,
};

describe("ItineraryClient", () => {
  const mockUpdateBasketConditions = vi.mocked(
    basketServiceModule.updateBasketConditions,
  );
  const mockAddBasketItem = vi.mocked(basketServiceModule.addBasketItem);
  const mockGetBasket = vi.mocked(basketServiceModule.getBasket);
  const mockRemoveBasketItem = vi.mocked(basketServiceModule.removeBasketItem);
  const mockGenerateItinerary = vi.mocked(
    itineraryServiceModule.generateItinerary,
  );
  const mockSaveItinerary = vi.mocked(itineraryServiceModule.saveItinerary);

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockUseItineraryMapData.mockReturnValue({ status: "ready", days: [] });
    // 대부분의 테스트는 reconcile 자체가 아니라 그 이후 흐름을 검증하므로,
    // 서버 바구니가 비어있다고 가정해 기존과 동일하게 로컬 항목이 전부
    // addBasketItem으로 추가되게 한다. reconcile 자체를 검증하는 테스트는
    // 이 기본값을 개별적으로 덮어쓴다.
    mockGetBasket.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
  });

  it("일정 생성하기 클릭 시 바구니/조건을 서버에 동기화한 뒤 generate를 호출하고 미리보기를 표시한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    await waitFor(() => {
      expect(mockGenerateItinerary).toHaveBeenCalled();
    });

    expect(mockUpdateBasketConditions).toHaveBeenCalledWith(
      expect.objectContaining({
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
      }),
      undefined,
    );
    expect(mockAddBasketItem).toHaveBeenCalledTimes(2);
    expect(mockAddBasketItem).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "content-1",
        priority: "MUST_VISIT",
      }),
      undefined,
    );

    // save API는 아직 호출되지 않아야 한다 — generate 응답은 미리보기일 뿐이다
    expect(mockSaveItinerary).not.toHaveBeenCalled();
    // generate 성공 시 로컬 바구니(장바구니)는 비운다 — 담아둔 콘텐츠가
    // 생성 이후에도 그대로 남아있던 문제를 해결한다.
    expect(mockClearBasket).toHaveBeenCalledTimes(1);
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("미리보기 사이드바에 Kakao 길찾기 실도로 거리로 '이동 거리 합계' 카드를 표시한다", async () => {
    mockUseItineraryMapData.mockReturnValue({
      status: "ready",
      days: [
        {
          dayIndex: 0,
          points: [
            { lat: 35.1, lng: 127.7, contentId: "content-1", title: "쌍계사" },
            {
              lat: 35.2,
              lng: 127.8,
              contentId: "content-2",
              title: "화개장터",
            },
          ],
          route: {
            totalDistanceMeters: 18_000,
            totalDurationSeconds: 1200,
            segments: [{ distanceMeters: 18_000, durationSeconds: 1200 }],
            path: [
              [127.7, 35.1],
              [127.8, 35.2],
            ],
          },
        },
      ],
    });
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    expect(await screen.findByText("이동 거리 합계")).toBeInTheDocument();
    expect(screen.getByText("18km")).toBeInTheDocument();
  });

  it("서버 바구니를 로컬 바구니에 맞춰 정리한다: 로컬에 없는 서버 항목은 지우고, 이미 서버에 있는 항목은 다시 추가하지 않는다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    // 서버엔 로컬에도 있는 content-1(이미 있으니 재추가 불필요)과,
    // 로컬 바구니엔 없는 과거 세션 잔재 content-stale(지워져야 함)이 있다.
    mockGetBasket.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [
        {
          itemId: "server-item-1",
          contentId: "content-1",
          title: "쌍계사",
          priority: "MUST_VISIT",
        },
        {
          itemId: "server-item-stale",
          contentId: "content-stale",
          title: "예전에 담았던 콘텐츠",
          priority: "OPTIONAL",
        },
      ],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-2",
      contentId: "content-2",
      title: "화개장터",
      priority: "OPTIONAL",
    });
    mockRemoveBasketItem.mockResolvedValue(undefined);
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    await waitFor(() => {
      expect(mockGenerateItinerary).toHaveBeenCalled();
    });

    // 로컬에 없는 서버 잔재(content-stale)만 지운다.
    expect(mockRemoveBasketItem).toHaveBeenCalledTimes(1);
    expect(mockRemoveBasketItem).toHaveBeenCalledWith(
      "server-item-stale",
      undefined,
    );

    // 이미 서버에 있는 content-1은 다시 추가하지 않고, 서버에 없는
    // content-2만 추가한다.
    expect(mockAddBasketItem).toHaveBeenCalledTimes(1);
    expect(mockAddBasketItem).toHaveBeenCalledWith(
      expect.objectContaining({ contentId: "content-2" }),
      undefined,
    );
  });

  it("이미 담긴 콘텐츠(BASKET_ITEM_DUPLICATE) 오류는 무시하고 generate를 계속 진행한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockRejectedValue(
      new ApiError(
        409,
        "이미 바구니에 담은 콘텐츠입니다.",
        "BASKET_ITEM_DUPLICATE",
        "t-1",
      ),
    );
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    await waitFor(() => {
      expect(mockGenerateItinerary).toHaveBeenCalled();
    });

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
  });

  it("결과 화면 여행 요약의 '담은 콘텐츠' 수는 생성된 일정의 장소 수로 표시한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    // 생성된 일정에는 장소가 1곳뿐 — 바구니(mock 2개)가 아니라 이 값이 나와야 한다.
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await screen.findByRole("button", { name: "저장" });

    const summary = screen.getByText("여행 요약").closest("section");
    expect(summary).not.toBeNull();
    expect(within(summary as HTMLElement).getByText("1개")).toBeInTheDocument();
  });

  it("generate 응답에 adjustments가 있으면 결과 화면에 조정 안내를 노출한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue({
      ...mockGenerateResponse,
      adjustments: ["'쌍계사'는 1일차 휴무여서 2일차로 옮겼습니다."],
    });

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    expect(
      await screen.findByText("AI가 일정을 이렇게 조정했어요"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("'쌍계사'는 1일차 휴무여서 2일차로 옮겼습니다."),
    ).toBeInTheDocument();
  });

  it("저장 버튼 클릭 시 미리보기 데이터를 SaveItineraryRequest로 변환해 save API를 호출한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await screen.findByRole("button", { name: "저장" });

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "저장하기" }),
    );

    await waitFor(() => {
      expect(mockSaveItinerary).toHaveBeenCalledWith(
        expect.objectContaining({
          title: mockGenerateResponse.title,
          region: mockGenerateResponse.region,
          travelDate: mockGenerateResponse.travelDate,
          duration: mockGenerateResponse.duration,
          days: [
            expect.objectContaining({
              dayIndex: 0,
              items: [
                expect.objectContaining({
                  contentId: "content-1",
                  order: 0,
                }),
              ],
            }),
          ],
        }),
        undefined,
      );
    });

    expect(await screen.findByText(/저장되었습니다/)).toBeInTheDocument();
  });

  it("저장 버튼 클릭 시 일정명 입력 폼이 열리고, 입력을 마치기 전까지는 save API가 호출되지 않는다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "저장" }));

    const titleInput = await screen.findByLabelText("일정명");
    expect(titleInput).toHaveValue(mockGenerateResponse.title);
    expect(mockSaveItinerary).not.toHaveBeenCalled();

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "나만의 하동 여행");
    await userEvent.click(screen.getByRole("button", { name: "저장하기" }));

    await waitFor(() => {
      expect(mockSaveItinerary).toHaveBeenCalledWith(
        expect.objectContaining({ title: "나만의 하동 여행" }),
        undefined,
      );
    });
  });

  it("생성된 항목의 pinned가 null/undefined여도 저장 요청에는 boolean으로 채워 보낸다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue({
      ...mockGenerateResponse,
      days: [
        {
          ...mockGenerateResponse.days[0],
          items: [
            {
              ...mockGenerateResponse.days[0].items[0],
              // 백엔드가 실제로는 pinned를 null로 내려보내는 경우가 있어 이를 재현한다.
              pinned: null as unknown as boolean,
            },
          ],
        },
      ],
    });
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await screen.findByRole("button", { name: "저장" });

    await userEvent.click(screen.getByRole("button", { name: "저장" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "저장하기" }),
    );

    await waitFor(() => {
      expect(mockSaveItinerary).toHaveBeenCalledWith(
        expect.objectContaining({
          days: [
            expect.objectContaining({
              items: [
                expect.objectContaining({
                  contentId: "content-1",
                  pinned: false,
                }),
              ],
            }),
          ],
        }),
        undefined,
      );
    });
  });

  it("generate가 AUTH_REQUIRED로 실패하면 오류 대신 로그인 안내 배너와 바구니 기반 미리보기를 표시한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockRejectedValue(
      new ApiError(401, "로그인이 필요합니다.", "AUTH_REQUIRED"),
    );

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    expect(
      await screen.findByText(/로그인하면 실제로 저장할 수 있어요/),
    ).toBeInTheDocument();
    // 로그인 전 결과 화면도 preview와 동일한 여행 요약 카드를 보여준다.
    expect(screen.getByText("여행 요약")).toBeInTheDocument();
    // 1일차 탭에는 쌍계사, 2일차 탭으로 넘기면 화개장터가 보인다.
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("tab")[1]);
    expect(screen.getByText("화개장터")).toBeInTheDocument();
    expect(screen.queryByText("로그인이 필요합니다.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "저장" }),
    ).not.toBeInTheDocument();
    const loginLink = screen.getByRole("link", { name: "로그인하고 계속하기" });
    expect(loginLink).toHaveAttribute(
      "href",
      expect.stringContaining("/login?next="),
    );
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toContain(
      "/itinerary?regions=HADONG",
    );
    expect(
      screen.getByRole("button", { name: "다시 생성" }),
    ).toBeInTheDocument();
    // 로그인 이후 흐름과 동일하게 로컬 바구니를 비운다(로그인 버튼을 누를 때만 복원).
    expect(mockClearBasket).toHaveBeenCalled();
  });

  it("로그인 미리보기에서 '로그인하고 계속하기'를 누르면 바구니를 복원한다", async () => {
    mockUpdateBasketConditions.mockRejectedValue(
      new ApiError(401, "로그인이 필요합니다.", "AUTH_REQUIRED"),
    );

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    const loginLink = await screen.findByRole("link", {
      name: "로그인하고 계속하기",
    });
    expect(mockSaveBasket).not.toHaveBeenCalled();

    await userEvent.click(loginLink);

    expect(mockSaveBasket).toHaveBeenCalledTimes(1);
    // 비우기 전 스냅샷(2개)을 그대로 복원한다.
    expect(mockSaveBasket.mock.calls[0][0]).toHaveLength(2);
    // 로그인 복귀용 링크에 resume 표시가 붙는다.
    expect(decodeURIComponent(loginLink.getAttribute("href") ?? "")).toContain(
      "resume=1",
    );
  });

  it("autoResume이면 마운트 직후 자동으로 진짜 생성을 시도한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGetBasket.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockGenerateItinerary.mockResolvedValue({
      title: "하동 여행",
      region: "HADONG",
      travelDate: "2026-08-01",
      duration: 1,
      adjustments: [],
      days: [
        {
          dayId: "day-1",
          dayIndex: 1,
          items: [
            {
              itemId: "i1",
              contentId: "content-1",
              title: "쌍계사",
              order: 0,
              reason: "대표 명소",
              pinned: false,
            },
          ],
        },
      ],
    });

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
        autoResume
      />,
    );

    // "일정 생성하기" 버튼을 누르지 않아도 생성 결과가 나온다.
    expect(
      await screen.findByRole("button", { name: "저장" }),
    ).toBeInTheDocument();
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(mockGenerateItinerary).toHaveBeenCalled();
  });

  it("generate가 AUTH_REQUIRED가 아닌 오류로 실패하면 기존처럼 오류 메시지를 표시한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockRejectedValue(
      new ApiError(500, "일시적인 오류가 발생했습니다.", "INTERNAL_ERROR"),
    );

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    expect(
      await screen.findByText("일시적인 오류가 발생했습니다."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
    expect(mockClearBasket).not.toHaveBeenCalled();
  });

  it("저장 성공 시 저장한 일정 목록에 요약이 기록된다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "저장" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "저장하기" }),
    );
    await screen.findByText(/저장되었습니다/);

    expect(mockAddSavedItinerary).toHaveBeenCalledTimes(1);
    expect(mockAddSavedItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itineraryId: mockSavedResponse.itineraryId,
        title: mockSavedResponse.title,
        region: mockSavedResponse.region,
      }),
    );
  });

  it("저장 완료 후 항목을 고정하고 '변경사항 저장'을 누르면 modifyItinerary를 호출한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);
    const mockModifyItinerary = vi.mocked(
      itineraryServiceModule.modifyItinerary,
    );
    mockModifyItinerary.mockResolvedValue(mockSavedResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "저장" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "저장하기" }),
    );
    await screen.findByText(/저장되었습니다/);

    await userEvent.click(screen.getByRole("button", { name: /고정/ }));

    const saveChangesButton = screen.getByRole("button", {
      name: "변경사항 저장",
    });
    expect(saveChangesButton).toBeEnabled();

    await userEvent.click(saveChangesButton);

    await waitFor(() => {
      expect(mockModifyItinerary).toHaveBeenCalledWith(
        mockSavedResponse.itineraryId,
        expect.objectContaining({
          title: mockSavedResponse.title,
          days: [
            expect.objectContaining({
              dayIndex: 0,
              items: [
                expect.objectContaining({
                  contentId: "content-1",
                  pinned: true,
                }),
              ],
            }),
          ],
        }),
        undefined,
      );
    });
  });

  it("저장 완료 후 공유하기 버튼을 클릭하면 공유 링크를 표시한다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);
    const mockCreateShare = vi.mocked(shareServiceModule.createShare);
    mockCreateShare.mockResolvedValue({
      token: "share-token-1",
      shareUrl: "https://pick-trip.example.com/share/share-token-1",
    });

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "저장" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "저장하기" }),
    );
    await screen.findByText(/저장되었습니다/);

    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));

    expect(mockCreateShare).toHaveBeenCalledWith("itinerary-1", undefined);
    expect(
      await screen.findByDisplayValue(
        `${window.location.origin}/share/share-token-1`,
      ),
    ).toBeInTheDocument();
  });

  it("생성 미리보기(저장 전) 화면에 대시보드로 이동하는 링크가 있다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await screen.findByRole("button", { name: "저장" });

    const dashboardLink = screen.getByRole("link", { name: /대시보드/ });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("저장 완료 화면에 대시보드로 이동하는 링크가 있다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);
    mockSaveItinerary.mockResolvedValue(mockSavedResponse);

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "저장" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "저장하기" }),
    );
    await screen.findByText(/저장되었습니다/);

    const dashboardLink = screen.getByRole("link", { name: /대시보드/ });
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("로그인 전 미리보기 화면에는 대시보드로 이동하는 링크가 없다", async () => {
    mockUpdateBasketConditions.mockResolvedValue({
      basketId: "basket-1",
      conditions: {
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        companions: [],
      },
      items: [],
    });
    mockAddBasketItem.mockResolvedValue({
      itemId: "server-item-1",
      contentId: "content-1",
      title: "쌍계사",
      priority: "MUST_VISIT",
    });
    mockGenerateItinerary.mockRejectedValue(
      new ApiError(401, "로그인이 필요합니다.", "AUTH_REQUIRED"),
    );

    renderWithClient(
      <ItineraryClient
        regions="HADONG"
        startDate="2026-08-01"
        nights="1"
        companions=""
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "일정 생성하기" }),
    );

    await screen.findByRole("link", { name: "로그인하고 계속하기" });

    expect(
      screen.queryByRole("link", { name: /대시보드/ }),
    ).not.toBeInTheDocument();
  });
});
