import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Content } from "@/types/content";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated" }),
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

import { useBasketStore } from "@/stores/basketStore";

import { RecommendedCard } from "./RecommendedCard";

const stub: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

describe("RecommendedCard", () => {
  beforeEach(() => {
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
    mockFavoriteItems = [];
  });

  it("이름/주소/카테고리 배지를 렌더한다", () => {
    render(<RecommendedCard content={stub} />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("경남 하동군")).toBeInTheDocument();
    expect(screen.getByText("문화")).toBeInTheDocument();
  });

  it("지역 라벨을 썸네일 우상단 반투명 배지로 렌더한다", () => {
    render(<RecommendedCard content={stub} />);

    const regionBadge = screen.getByText("하동");
    expect(regionBadge).toHaveClass("bg-white/90");
  });

  it("요약을 렌더한다", () => {
    render(<RecommendedCard content={stub} />);

    expect(screen.getByText("천년 고찰")).toBeInTheDocument();
  });

  it("담기 버튼 클릭 시 바구니에 담기고 담김으로 바뀐다", async () => {
    render(<RecommendedCard content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(screen.getByRole("button", { name: "담김" })).toBeInTheDocument();
    expect(useBasketStore.getState().items).toHaveLength(1);
  });

  it("찜 아이콘 클릭 시 찜 목록에 추가되고 다시 누르면 해제된다", async () => {
    render(<RecommendedCard content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "찜하기" }));
    expect(screen.getByRole("button", { name: "찜 해제" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "찜 해제" }));
    expect(screen.getByRole("button", { name: "찜하기" })).toBeInTheDocument();
  });

  it("detailHref가 없으면 상세 페이지로 이동하는 링크가 없다", () => {
    render(<RecommendedCard content={stub} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("detailHref가 있으면 해당 경로로 이동하는 링크를 렌더한다", () => {
    render(
      <RecommendedCard
        content={stub}
        detailHref={`/contents/${stub.id}?from=favorites`}
      />,
    );

    expect(screen.getByRole("link", { name: /쌍계사/ })).toHaveAttribute(
      "href",
      "/contents/1?from=favorites",
    );
  });
});
