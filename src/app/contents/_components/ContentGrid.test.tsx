import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated" }),
}));

vi.mock("@/services/contentService", () => ({
  getContents: vi.fn(),
}));

import { getContents } from "@/services/contentService";
import { useBasketStore } from "@/stores/basketStore";
import type { Content } from "@/types/content";

import { ContentGrid } from "./ContentGrid";

const mockGetContents = vi.mocked(getContents);

const makeContent = (overrides: Partial<Content> = {}): Content => ({
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군 화개면",
  summary: "천년 고찰",
  indoor: false,
  ...overrides,
});

const defaultItineraryHref =
  "/itinerary?regions=HADONG,YEONGJU&startDate=2026-06-20&nights=1";
const defaultConditionLine = "하동, 영주 · 2026년 6월 20일 (토) · 1박 2일";
// 지역 탭 전환 테스트를 위해 2개 지역으로 둔다. /contents는 사용자가 여행
// 조건 단계에서 고른 지역만 받으므로 REGIONS 전체가 아닐 수 있다.
const defaultQueryParams = {
  regions: ["HADONG", "YEONGJU"],
  startDate: "2026-06-20",
  nights: 1,
};

// ContentGrid는 useLoadMoreContents(useInfiniteQuery)를 쓰므로 로컬
// QueryClientProvider로 감싸야 한다. initialTotal은 기본적으로
// initialContents.length와 같게 줘서(더 불러올 게 없는 상태) 더보기 버튼과
// 무관한 기존 필터 테스트들이 그대로 통과하게 한다.
function renderContentGrid({
  initialContents,
  initialTotal = initialContents.length,
  queryParams = defaultQueryParams,
  itineraryHref = defaultItineraryHref,
  conditionLine = defaultConditionLine,
}: {
  initialContents: Content[];
  initialTotal?: number;
  queryParams?: typeof defaultQueryParams;
  itineraryHref?: string;
  conditionLine?: string;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ContentGrid
        initialContents={initialContents}
        initialTotal={initialTotal}
        queryParams={queryParams}
        itineraryHref={itineraryHref}
        conditionLine={conditionLine}
      />
    </QueryClientProvider>,
  );
}

describe("ContentGrid", () => {
  beforeEach(() => {
    localStorage.clear();
    // 전역 바구니 스토어는 테스트 간 상태가 누수되므로 초기 상태로 리셋한다.
    useBasketStore.setState({ items: [], hydrated: false });
    vi.resetAllMocks();
    // ContentBrowser는 마운트 시 window.location.search로 초기 필터를 읽고
    // 필터 변경 시 history.replaceState로 되쓴다. jsdom은 이 값을 테스트
    // 사이에 유지하므로 매 테스트 전에 초기화한다.
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("전달받은 콘텐츠 카드를 모두 렌더한다", () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    renderContentGrid({ initialContents: contents });

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("하동 재첩국")).toBeInTheDocument();
  });

  it("카테고리 필터 선택 시 해당 카테고리만 표시된다", async () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사", category: "CULTURE" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    renderContentGrid({ initialContents: contents });

    await userEvent.click(screen.getByRole("button", { name: "문화" }));

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.queryByText("하동 재첩국")).not.toBeInTheDocument();
  });

  it("검색어 입력 시 이름이 일치하는 카드만 표시된다", async () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    renderContentGrid({ initialContents: contents });

    await userEvent.type(screen.getByRole("searchbox"), "쌍계");

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.queryByText("하동 재첩국")).not.toBeInTheDocument();
  });

  it("필터 결과가 없을 때 빈 상태 메시지를 표시한다", async () => {
    renderContentGrid({
      initialContents: [makeContent({ name: "쌍계사" })],
    });

    await userEvent.type(screen.getByRole("searchbox"), "없는콘텐츠xyz");

    expect(
      screen.getByText(/조건에 맞는 콘텐츠가 없습니다/),
    ).toBeInTheDocument();
  });

  it("콘텐츠가 없을 때 빈 상태 메시지를 표시한다", () => {
    renderContentGrid({ initialContents: [] });

    expect(screen.getByText("콘텐츠가 없습니다")).toBeInTheDocument();
  });

  it("콘텐츠 목록이 비어 있어도 이미 담아둔 바구니 항목은 계속 보여준다", () => {
    useBasketStore.setState({
      items: [
        {
          content: makeContent({ id: "1", name: "쌍계사" }),
          addedAt: Date.now(),
          priority: null,
          desiredStayMinutes: null,
        },
      ],
      hydrated: true,
    });

    renderContentGrid({ initialContents: [] });

    expect(screen.getByText("콘텐츠가 없습니다")).toBeInTheDocument();
    expect(screen.getAllByText("여행 바구니").length).toBeGreaterThan(0);
    expect(screen.getAllByText("쌍계사").length).toBeGreaterThan(0);
  });

  it("담기 버튼 클릭 시 새로고침 없이 담김으로 즉시 바뀐다", async () => {
    renderContentGrid({
      initialContents: [makeContent({ id: "1", name: "쌍계사" })],
    });

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(screen.getByRole("button", { name: "담김" })).toBeInTheDocument();
  });

  it("담김 버튼을 다시 누르면 담기로 즉시 바뀐다", async () => {
    renderContentGrid({
      initialContents: [makeContent({ id: "1", name: "쌍계사" })],
    });

    await userEvent.click(screen.getByRole("button", { name: "담기" }));
    await userEvent.click(screen.getByRole("button", { name: "담김" }));

    expect(screen.getByRole("button", { name: "담기" })).toBeInTheDocument();
  });

  it("지역 탭 전환 시 그 지역으로만 getContents를 호출하고, 이전 지역 카드는 사라진다", async () => {
    mockGetContents.mockResolvedValueOnce({
      contents: [makeContent({ id: "2", name: "부석사", region: "YEONGJU" })],
      total: 1,
    });

    renderContentGrid({
      initialContents: [
        makeContent({ id: "1", name: "쌍계사", region: "HADONG" }),
      ],
    });

    await userEvent.click(screen.getByRole("tab", { name: "영주" }));

    await waitFor(() =>
      expect(mockGetContents).toHaveBeenCalledWith({
        ...defaultQueryParams,
        regions: ["YEONGJU"],
        page: 0,
        size: 20,
      }),
    );
    await waitFor(() => expect(screen.getByText("부석사")).toBeInTheDocument());
    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
  });

  it("initialTotal이 initialContents.length보다 크면 더보기 버튼이 보인다", () => {
    renderContentGrid({
      initialContents: [makeContent({ id: "1" })],
      initialTotal: 3,
    });

    expect(screen.getByRole("button", { name: /더보기/ })).toBeInTheDocument();
  });

  it("initialTotal이 initialContents.length와 같으면 완료 문구가 보인다", () => {
    renderContentGrid({
      initialContents: [makeContent({ id: "1" })],
      initialTotal: 1,
    });

    expect(
      screen.queryByRole("button", { name: /더보기/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/모두 확인했어요/)).toBeInTheDocument();
  });

  it("더보기 클릭 시 다음 페이지를 요청하고 결과를 끝에 이어붙인다", async () => {
    mockGetContents.mockResolvedValueOnce({
      contents: [makeContent({ id: "2", name: "화개장터" })],
      total: 2,
    });

    renderContentGrid({
      initialContents: [makeContent({ id: "1", name: "쌍계사" })],
      initialTotal: 2,
    });

    await userEvent.click(screen.getByRole("button", { name: /더보기/ }));

    // size는 항상 CONTENT_PAGE_SIZE(20)로 넘긴다 — getContents가 지역별로
    // 쪼개므로 한 페이지 합계는 20으로 유지된다.
    expect(mockGetContents).toHaveBeenCalledWith({
      ...defaultQueryParams,
      page: 1,
      size: 20,
    });
    await waitFor(() =>
      expect(screen.getByText("화개장터")).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(screen.getByText(/모두 확인했어요/)).toBeInTheDocument(),
    );

    const names = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(["쌍계사", "화개장터"]);
  });

  it("더보기 요청이 실패하면 에러 메시지를 표시한다", async () => {
    mockGetContents.mockRejectedValueOnce(
      new Error("콘텐츠를 더 불러오지 못했습니다."),
    );

    renderContentGrid({
      initialContents: [makeContent({ id: "1" })],
      initialTotal: 2,
    });

    await userEvent.click(screen.getByRole("button", { name: /더보기/ }));

    expect(await screen.findByText(/오류가 발생했습니다/)).toBeInTheDocument();
  });
});
