import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/contentService", () => ({
  getContents: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated" }),
}));
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({
    items: [],
    add: vi.fn(),
    remove: vi.fn(),
    isFavorited: () => false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isAdding: false,
    isRemoving: false,
  }),
}));

import { useBasketStore } from "@/stores/basketStore";
import {
  CATEGORY_LABELS,
  CONTENT_CATEGORY_ORDER,
  type Content,
} from "@/types/content";

import { TryItGallery } from "./TryItGallery";

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

const sample: Content[] = [
  makeContent({ id: "1", name: "쌍계사", category: "CULTURE" }),
  makeContent({ id: "2", name: "고하버거 하동본점", category: "FOOD" }),
  makeContent({ id: "3", name: "십리벚꽃길", category: "NATURE" }),
  makeContent({ id: "4", name: "최참판댁", category: "EXPERIENCE" }),
  makeContent({ id: "5", name: "화개장터", category: "CULTURE" }),
];

function renderGallery(initialContents: Content[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TryItGallery initialContents={initialContents} />
    </QueryClientProvider>,
  );
}

describe("TryItGallery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("필터 결과 상위 4개만 카드로 보여준다", () => {
    renderGallery(sample);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("최참판댁")).toBeInTheDocument();
    expect(screen.queryByText("화개장터")).not.toBeInTheDocument();
  });

  it("칩을 바꾸면 그 카테고리 콘텐츠만 남는다", async () => {
    renderGallery(sample);

    await userEvent.click(screen.getByRole("button", { name: "음식" }));

    expect(screen.getByText("고하버거 하동본점")).toBeInTheDocument();
    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
  });

  it("칩은 전체 + CONTENT_CATEGORY_ORDER 순서로 렌더된다", () => {
    renderGallery(sample);

    const chips = within(screen.getByRole("group", { name: "카테고리 필터" }))
      .getAllByRole("button")
      .map((b) => b.textContent);

    expect(chips).toEqual([
      "전체",
      ...CONTENT_CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c]),
    ]);
  });

  it("카드의 담기 버튼을 누르면 바구니에 담기고 '담김'으로 바뀐다", async () => {
    renderGallery(sample);

    const card = screen.getByText("쌍계사").closest("a")
      ?.parentElement as HTMLElement;
    await userEvent.click(within(card).getByRole("button", { name: "담기" }));

    expect(useBasketStore.getState().items).toHaveLength(1);
    expect(
      within(card).getByRole("button", { name: "담김" }),
    ).toBeInTheDocument();
  });

  it("바구니가 비면 CTA가 '여행 조건부터 정하기'이고 조건 화면으로 연결된다", () => {
    renderGallery(sample);

    const cta = screen.getByRole("link", { name: "여행 조건부터 정하기" });
    expect(cta).toHaveAttribute(
      "href",
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
  });

  it("바구니에 담기면 CTA가 담은 개수를 반영한다", () => {
    useBasketStore.setState({
      items: [
        { content: sample[0], addedAt: 1, priority: null },
        { content: sample[1], addedAt: 2, priority: null },
      ],
      hydrated: true,
    });

    renderGallery(sample);

    expect(
      screen.getByRole("link", { name: "담은 2곳으로 일정 만들기" }),
    ).toHaveAttribute(
      "href",
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
  });

  it("바구니 개수에 따라 보조 문구가 바뀐다", () => {
    const { rerender } = renderGallery(sample);

    expect(
      screen.getByText("두 곳만 담아도 일정을 만들 수 있어요"),
    ).toBeInTheDocument();

    useBasketStore.setState({
      items: [{ content: sample[0], addedAt: 1, priority: null }],
      hydrated: true,
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    rerender(
      <QueryClientProvider client={client}>
        <TryItGallery initialContents={sample} />
      </QueryClientProvider>,
    );

    expect(
      screen.getByText("1개 담았어요. 두 곳 이상이면 바로 생성됩니다"),
    ).toBeInTheDocument();
  });

  it("결과가 0개인 카테고리는 빈 상태 문구를 보여준다", async () => {
    renderGallery(sample);

    await userEvent.click(screen.getByRole("button", { name: "축제" }));

    expect(
      screen.getByText("해당 카테고리 콘텐츠를 준비 중이에요"),
    ).toBeInTheDocument();
  });
});
