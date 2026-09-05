import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/basket",
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
import type { BasketItem } from "@/types/basket";
import type { Content } from "@/types/content";

import { BasketPageClient } from "./BasketPageClient";

const makeContent = (overrides: Partial<Content> = {}): Content => ({
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
  ...overrides,
});

const makeItem = (overrides: Partial<Content> = {}): BasketItem => ({
  content: makeContent(overrides),
  addedAt: Date.now(),
  priority: null,
});

function setBasket(items: BasketItem[]) {
  useBasketStore.setState({ items, hydrated: true });
}

describe("BasketPageClient", () => {
  beforeEach(() => {
    mockPush.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("바구니가 비어 있으면 안내 문구와 여행 조건 페이지 링크를 보여준다", () => {
    render(<BasketPageClient />);

    expect(screen.getByText("아직 담은 콘텐츠가 없습니다")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /여행 조건 정하러 가기/ }),
    ).toHaveAttribute(
      "href",
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
  });

  it("담은 콘텐츠를 상세 링크가 걸린 카드로 렌더한다", () => {
    setBasket([
      makeItem({ id: "1", name: "쌍계사" }),
      makeItem({ id: "2", name: "최참판댁" }),
    ]);

    render(<BasketPageClient />);

    expect(screen.getByRole("link", { name: /쌍계사/ })).toHaveAttribute(
      "href",
      "/contents/1",
    );
    expect(screen.getByRole("link", { name: /최참판댁/ })).toHaveAttribute(
      "href",
      "/contents/2",
    );
  });

  it("담긴 지역이 하나면 지역 탭을 보여주지 않는다", () => {
    setBasket([
      makeItem({ id: "1", region: "HADONG" }),
      makeItem({ id: "2", region: "HADONG" }),
    ]);

    render(<BasketPageClient />);

    expect(screen.queryByRole("tablist", { name: "지역" })).toBeNull();
  });

  it("여러 지역이 담기면 지역 탭으로 필터한다", async () => {
    setBasket([
      makeItem({ id: "1", name: "쌍계사", region: "HADONG" }),
      makeItem({ id: "2", name: "부석사", region: "YEONGJU" }),
    ]);

    render(<BasketPageClient />);

    expect(screen.getByRole("link", { name: /쌍계사/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /부석사/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "영주" }));

    expect(screen.queryByRole("link", { name: /쌍계사/ })).toBeNull();
    expect(screen.getByRole("link", { name: /부석사/ })).toBeInTheDocument();
  });

  it("2개 이상이면 AI 일정 생성 시 담긴 지역으로 여행 조건 페이지로 이동한다", async () => {
    setBasket([
      makeItem({ id: "1", region: "HADONG" }),
      makeItem({ id: "2", region: "YEONGJU" }),
    ]);

    render(<BasketPageClient />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "AI 일정 생성" })[0],
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/select/conditions?regions=HADONG,YEONGJU",
    );
  });
});
