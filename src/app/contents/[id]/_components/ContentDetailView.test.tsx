import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installKakaoMock, uninstallKakaoMock } from "@/test/kakaoMapMock";
import type { Content, ContentDetail } from "@/types/content";

const mockBack = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  usePathname: () => "/contents/1",
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// useFavorites는 서버 상태(React Query)라 전역 스토어로 직접 시드할 수 없다.
// 테스트 안에서는 React state로 동작하는 가벼운 대역으로 대체해 add/remove
// 클릭이 실제로 items를 바꾸고 재렌더되게 한다.
let mockFavoriteItems: Content[] = [];
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => {
    const [items, setItems] = useState<Content[]>(mockFavoriteItems);
    return {
      items,
      add: (content: Content) =>
        setItems((prev) =>
          prev.some((c) => c.id === content.id) ? prev : [...prev, content],
        ),
      remove: (contentId: string) =>
        setItems((prev) => prev.filter((c) => c.id !== contentId)),
      isFavorited: (contentId: string) => items.some((c) => c.id === contentId),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isAdding: false,
      isRemoving: false,
    };
  },
}));

const loadKakaoMaps = vi.fn(() => Promise.resolve());
vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => loadKakaoMaps(),
}));

// 근처 콘텐츠는 useQuery(네트워크)에 의존한다 — 이 화면 테스트에서는 렌더만
// 확인하면 되므로 빈 컴포넌트로 대체하고, 자체 동작은 NearbyContents.test.tsx에서 검증한다.
vi.mock("./NearbyContents", () => ({
  NearbyContents: () => null,
}));

import { useBasketStore } from "@/stores/basketStore";
import { useRecentViewsStore } from "@/stores/recentViewsStore";

import { ContentDetailView } from "./ContentDetailView";

const stub: ContentDetail = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군 화개면",
  summary: "천년 고찰, 봄이면 벚꽃이 만발한다",
  indoor: false,
  operatingHours: "09:00 - 18:00",
  closedDay: "연중무휴",
  parking: true,
  stayDuration: "1시간",
  reservationRequired: false,
  dataSource: "한국관광공사",
  imageUrls: [],
  latitude: 35.2345,
  longitude: 127.6789,
};

describe("ContentDetailView", () => {
  const clipboardWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockBack.mockClear();
    mockPush.mockClear();
    mockUseAuth.mockReturnValue({ status: "authenticated" });
    loadKakaoMaps.mockReturnValue(Promise.resolve());
    installKakaoMock();
    // jsdom 에는 navigator.clipboard 가 없다 — 주소 복사 버튼용으로 주입한다.
    clipboardWriteText.mockClear();
    Object.assign(navigator, { clipboard: { writeText: clipboardWriteText } });
    // 전역 스토어는 테스트 간 상태가 누수되므로 초기 상태로 리셋한다.
    useBasketStore.setState({ items: [], hydrated: false });
    mockFavoriteItems = [];
    useRecentViewsStore.setState({ items: [], hydrated: false });
  });

  afterEach(() => {
    uninstallKakaoMock();
  });

  it("콘텐츠 이름을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
  });

  it("운영시간을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("09:00 - 18:00")).toBeInTheDocument();
  });

  it("주차 가능이면 '가능'을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("가능")).toBeInTheDocument();
  });

  it("예약 불필요이면 '불필요'를 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("불필요")).toBeInTheDocument();
  });

  it("운영시간이 null이면 정보 없음을 표시한다", () => {
    render(<ContentDetailView content={{ ...stub, operatingHours: null }} />);
    expect(screen.getAllByText("정보 없음").length).toBeGreaterThan(0);
  });

  it("운영시간 원문에 <br> 태그가 있으면 여러 줄로 나눠 렌더한다", () => {
    render(
      <ContentDetailView
        content={{
          ...stub,
          operatingHours: "평일 09:00~18:00<br>주말 10:00~17:00",
        }}
      />,
    );
    expect(screen.getByText("평일 09:00~18:00")).toBeInTheDocument();
    expect(screen.getByText("주말 10:00~17:00")).toBeInTheDocument();
    expect(
      screen.queryByText(/평일 09:00~18:00<br>주말/),
    ).not.toBeInTheDocument();
  });

  it("데이터 출처를 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("한국관광공사")).toBeInTheDocument();
  });

  it("백엔드가 내려주는 원본 dataSource 값과 무관하게 데이터 출처를 한국관광공사로 표시한다", () => {
    render(<ContentDetailView content={{ ...stub, dataSource: "TourAPI" }} />);
    expect(screen.getByText("한국관광공사")).toBeInTheDocument();
    expect(screen.queryByText("TourAPI")).not.toBeInTheDocument();
  });

  it("dataSource가 없으면 데이터 출처 행을 렌더하지 않는다", () => {
    render(<ContentDetailView content={{ ...stub, dataSource: null }} />);
    expect(screen.queryByText("데이터 출처")).not.toBeInTheDocument();
  });

  it("담기 버튼을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByRole("button", { name: /담기/ })).toBeInTheDocument();
  });

  it("담기 버튼 클릭 시 새로고침 없이 담김으로 즉시 바뀐다", async () => {
    render(<ContentDetailView content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "일정에 담기" }));

    expect(
      screen.getByRole("button", { name: "일정에 담김" }),
    ).toBeInTheDocument();
  });

  it("showBasketAction이 false이면 담기 버튼을 렌더하지 않는다", () => {
    render(<ContentDetailView content={stub} showBasketAction={false} />);
    expect(
      screen.queryByRole("button", { name: /담기|담김/ }),
    ).not.toBeInTheDocument();
  });

  it("앱 내 히스토리가 있으면 '목록으로'가 router.back으로 직전 화면에 복귀한다", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    render(<ContentDetailView content={stub} backHref="/explore" />);

    await userEvent.click(screen.getByRole("button", { name: /목록으로/ }));

    expect(mockBack).toHaveBeenCalledOnce();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("직접 진입(히스토리 없음)이면 '목록으로'가 backHref 경로로 이동한다", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(<ContentDetailView content={stub} backHref="/explore" />);

    await userEvent.click(screen.getByRole("button", { name: /목록으로/ }));

    expect(mockPush).toHaveBeenCalledWith("/explore");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("backHref가 없고 히스토리도 없으면 /contents로 이동한다", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    render(<ContentDetailView content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: /목록으로/ }));

    expect(mockPush).toHaveBeenCalledWith("/contents");
  });

  it("찜 버튼을 렌더하고 클릭하면 찜 상태가 토글된다", async () => {
    render(<ContentDetailView content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "찜하기" }));

    expect(screen.getByRole("button", { name: "찜 해제" })).toBeInTheDocument();
  });

  it("비로그인 상태에서는 하트가 비활성이고 클릭 시 로그인으로 유도한다", async () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated" });
    mockFavoriteItems = [stub];

    render(<ContentDetailView content={stub} />);

    const heart = screen.getByRole("button", { name: "찜하기" });
    expect(heart).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(heart);

    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Fcontents%2F1");
    // 비로그인 상태라 add/remove가 호출되지 않고 하트는 그대로 비활성이다.
    expect(screen.getByRole("button", { name: "찜하기" })).toBeInTheDocument();
  });

  it("showBasketAction이 false이면 찜 버튼도 렌더하지 않는다", () => {
    render(<ContentDetailView content={stub} showBasketAction={false} />);
    expect(
      screen.queryByRole("button", { name: /찜하기|찜 해제/ }),
    ).not.toBeInTheDocument();
  });

  it("마운트 시 최근 본 콘텐츠로 기록한다", () => {
    render(<ContentDetailView content={stub} />);

    const items = useRecentViewsStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].content.id).toBe("1");
  });

  it("사진이 여러 장이면 갤러리 화살표와 썸네일 버튼을 렌더한다", () => {
    render(
      <ContentDetailView
        content={{
          ...stub,
          imageUrl: "https://example.com/1.jpg",
          imageUrls: ["https://example.com/2.jpg", "https://example.com/3.jpg"],
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "다음 사진" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /번 사진 보기$/ }),
    ).toHaveLength(3);
  });

  it("사진이 한 장뿐이면 갤러리 화살표를 렌더하지 않는다", () => {
    render(
      <ContentDetailView
        content={{ ...stub, imageUrl: "https://example.com/1.jpg" }}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "다음 사진" }),
    ).not.toBeInTheDocument();
  });

  it("좌표가 유효하면 지도 패널과 '카카오맵 길찾기' 버튼을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);

    expect(screen.getByTestId("content-map")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "카카오맵 길찾기" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/위치 좌표가 없어요/)).not.toBeInTheDocument();
  });

  it("좌표가 (0, 0)이면 안내 문구를 보이고 길찾기 버튼을 숨긴다", () => {
    render(
      <ContentDetailView content={{ ...stub, latitude: 0, longitude: 0 }} />,
    );

    expect(screen.getByText(/위치 좌표가 없어요/)).toBeInTheDocument();
    expect(screen.queryByTestId("content-map")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "카카오맵 길찾기" }),
    ).not.toBeInTheDocument();
    // 좌표가 없어도 주소 복사는 남는다.
    expect(
      screen.getByRole("button", { name: "주소 복사" }),
    ).toBeInTheDocument();
  });

  it("'주소 복사' 클릭 시 clipboard.writeText가 주소로 호출되고 라벨이 바뀐다", async () => {
    render(<ContentDetailView content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "주소 복사" }));

    expect(clipboardWriteText).toHaveBeenCalledWith("경남 하동군 화개면");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "복사됨" }),
      ).toBeInTheDocument(),
    );
  });

  it("'카카오맵 길찾기' 클릭 시 카카오맵 길찾기 URL을 새 창으로 연다", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ContentDetailView content={stub} />);

    await userEvent.click(
      screen.getByRole("button", { name: "카카오맵 길찾기" }),
    );

    expect(open).toHaveBeenCalledWith(
      `https://map.kakao.com/link/to/${encodeURIComponent("쌍계사")},35.2345,127.6789`,
      "_blank",
      "noopener,noreferrer",
    );
  });
});
