import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { nickname: "김여행" },
  }),
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
import type { Content } from "@/types/content";

import { ForYouSection } from "./ForYouSection";

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

describe("ForYouSection", () => {
  beforeEach(() => {
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("'For You' 라벨과 '{닉네임}님을 위한 추천' 제목을 렌더한다", () => {
    render(<ForYouSection recommendedPool={[makeContent()]} />);

    expect(screen.getByText("For You")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "김여행님을 위한 추천" }),
    ).toBeInTheDocument();
  });

  it("바구니에 이미 담긴 콘텐츠는 추천에서 제외한다", () => {
    useBasketStore.setState({
      items: [
        {
          content: makeContent({ id: "1" }),
          addedAt: Date.now(),
          priority: null,
        },
      ],
      hydrated: true,
    });
    const pool = [
      makeContent({ id: "1", name: "쌍계사" }),
      makeContent({ id: "2", name: "화개장터" }),
    ];

    render(<ForYouSection recommendedPool={pool} />);

    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
    expect(screen.getByText("화개장터")).toBeInTheDocument();
  });

  it("추천 콘텐츠가 없으면 아무것도 렌더하지 않는다", () => {
    const { container } = render(<ForYouSection recommendedPool={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("최대 8개까지만 렌더한다", () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      makeContent({ id: String(i), name: `콘텐츠${i}` }),
    );

    render(<ForYouSection recommendedPool={pool} />);

    expect(screen.getAllByText(/^콘텐츠\d+$/)).toHaveLength(8);
  });

  it("추천 콘텐츠가 8개를 초과하면 /dashboard/for-you로 이동하는 더보기 링크를 보여준다", () => {
    const pool = Array.from({ length: 9 }, (_, i) =>
      makeContent({ id: String(i), name: `콘텐츠${i}` }),
    );

    render(<ForYouSection recommendedPool={pool} />);

    expect(screen.getByRole("link", { name: "더보기 →" })).toHaveAttribute(
      "href",
      "/dashboard/for-you",
    );
  });

  it("추천 콘텐츠가 8개 이하면 더보기 링크를 보여주지 않는다", () => {
    render(<ForYouSection recommendedPool={[makeContent()]} />);

    expect(
      screen.queryByRole("link", { name: "더보기 →" }),
    ).not.toBeInTheDocument();
  });

  it("category를 지정하면 해당 카테고리만 보여준다(퀵 카테고리 필터 연동)", () => {
    const pool = [
      makeContent({ id: "1", name: "쌍계사", category: "CULTURE" }),
      makeContent({ id: "2", name: "화개장터", category: "FOOD" }),
    ];

    render(<ForYouSection recommendedPool={pool} category="FOOD" />);

    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
    expect(screen.getByText("화개장터")).toBeInTheDocument();
  });
});
