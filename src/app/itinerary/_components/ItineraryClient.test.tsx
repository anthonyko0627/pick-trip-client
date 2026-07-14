import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as basketServiceModule from "@/services/basketService";
import * as itineraryServiceModule from "@/services/itineraryService";
import * as shareServiceModule from "@/services/shareService";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
} from "@/types/itinerary";
import { ItineraryClient } from "./ItineraryClient";

vi.mock("@/services/basketService");
vi.mock("@/services/itineraryService");
vi.mock("@/services/shareService");

const BASKET_STORAGE_KEY = "pick-trip-basket";

function seedBasket() {
  localStorage.setItem(
    BASKET_STORAGE_KEY,
    JSON.stringify([
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
    ]),
  );
}

const mockGenerateResponse: ItineraryGenerateResponse = {
  title: "하동 1박 2일 여행",
  region: "HADONG",
  travelDate: "2026-08-01",
  duration: 1,
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
  const mockGenerateItinerary = vi.mocked(
    itineraryServiceModule.generateItinerary,
  );
  const mockSaveItinerary = vi.mocked(itineraryServiceModule.saveItinerary);

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("일정 생성하기 클릭 시 바구니/조건을 서버에 동기화한 뒤 generate를 호출하고 미리보기를 표시한다", async () => {
    seedBasket();
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

    render(
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
    );
    expect(mockAddBasketItem).toHaveBeenCalledTimes(2);
    expect(mockAddBasketItem).toHaveBeenCalledWith(
      expect.objectContaining({
        contentId: "content-1",
        priority: "MUST_VISIT",
      }),
    );

    // save API는 아직 호출되지 않아야 한다 — generate 응답은 미리보기일 뿐이다
    expect(mockSaveItinerary).not.toHaveBeenCalled();
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장" })).toBeInTheDocument();
  });

  it("이미 담긴 콘텐츠(BASKET_ITEM_DUPLICATE) 오류는 무시하고 generate를 계속 진행한다", async () => {
    seedBasket();
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
      new Error(
        'API 409: {"code":"BASKET_ITEM_DUPLICATE","message":"이미 바구니에 담은 콘텐츠입니다.","traceId":"t-1"}',
      ),
    );
    mockGenerateItinerary.mockResolvedValue(mockGenerateResponse);

    render(
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

  it("저장 버튼 클릭 시 미리보기 데이터를 SaveItineraryRequest로 변환해 save API를 호출한다", async () => {
    seedBasket();
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

    render(
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
      );
    });

    expect(await screen.findByText(/저장되었습니다/)).toBeInTheDocument();
  });

  it("generate가 AUTH_REQUIRED로 실패하면 오류 대신 로그인 안내 배너와 바구니 기반 미리보기를 표시한다", async () => {
    seedBasket();
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
      new Error(
        'API 401: {"code":"AUTH_REQUIRED","message":"로그인이 필요합니다."}',
      ),
    );

    render(
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
      await screen.findByText(/로그인 기능은 준비 중입니다/),
    ).toBeInTheDocument();
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("화개장터")).toBeInTheDocument();
    expect(screen.queryByText("로그인이 필요합니다.")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "저장" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 생성" }),
    ).toBeInTheDocument();
  });

  it("generate가 AUTH_REQUIRED가 아닌 오류로 실패하면 기존처럼 오류 메시지를 표시한다", async () => {
    seedBasket();
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
      new Error(
        'API 500: {"code":"INTERNAL_ERROR","message":"일시적인 오류가 발생했습니다."}',
      ),
    );

    render(
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
  });

  it("저장 성공 시 저장한 일정 목록(localStorage)에 요약이 기록된다", async () => {
    seedBasket();
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

    render(
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
    await screen.findByText(/저장되었습니다/);

    const stored = JSON.parse(
      localStorage.getItem("pick-trip-saved-itineraries") ?? "[]",
    );
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      itineraryId: mockSavedResponse.itineraryId,
      title: mockSavedResponse.title,
      region: mockSavedResponse.region,
    });
  });

  it("저장 완료 후 항목을 고정하고 '변경사항 저장'을 누르면 modifyItinerary를 호출한다", async () => {
    seedBasket();
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

    render(
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
      );
    });
  });

  it("저장 완료 후 공유하기 버튼을 클릭하면 공유 링크를 표시한다", async () => {
    seedBasket();
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

    render(
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
    await screen.findByText(/저장되었습니다/);

    await userEvent.click(screen.getByRole("button", { name: "공유하기" }));

    expect(mockCreateShare).toHaveBeenCalledWith("itinerary-1");
    expect(
      await screen.findByDisplayValue(
        "https://pick-trip.example.com/share/share-token-1",
      ),
    ).toBeInTheDocument();
  });
});
