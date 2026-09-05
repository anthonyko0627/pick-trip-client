import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Content } from "@/types/content";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/explore",
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// useFavorites는 서버 상태(React Query)로 바뀌어 전역 스토어로 직접 시드할 수
// 없다. 테스트 안에서는 React state로 동작하는 가벼운 대역으로 대체해
// add/remove 클릭이 실제로 items를 바꾸고 재렌더되게 한다. mockFavoriteItems는
// 매 테스트의 초기 시드값이고, 마운트 이후에는 이 배열과 무관하게 컴포넌트
// 내부 state로만 동작한다(useState 초기값은 최초 렌더에서만 읽힌다).
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

import { ContentCardActions } from "./ContentCardActions";

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

describe("ContentCardActions", () => {
  beforeEach(() => {
    localStorage.clear();
    mockPush.mockClear();
    mockUseAuth.mockReturnValue({ status: "authenticated" });
    useBasketStore.setState({ items: [], hydrated: true });
    mockFavoriteItems = [];
  });

  it("담기 버튼 클릭 시 바구니에 담기고 담김으로 바뀐다", async () => {
    render(<ContentCardActions content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(screen.getByRole("button", { name: "담김" })).toBeInTheDocument();
    expect(useBasketStore.getState().items).toHaveLength(1);
  });

  it("로그인 상태에서 찜 아이콘 클릭 시 추가되고 다시 누르면 해제된다", async () => {
    render(<ContentCardActions content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "찜하기" }));
    expect(screen.getByRole("button", { name: "찜 해제" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "찜 해제" }));
    expect(screen.getByRole("button", { name: "찜하기" })).toBeInTheDocument();
  });

  it("비로그인 상태에서는 이미 찜한 콘텐츠라도 하트가 비활성이다", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated" });
    mockFavoriteItems = [stub];

    render(<ContentCardActions content={stub} />);

    const heart = screen.getByRole("button", { name: "찜하기" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
  });

  it("비로그인 상태에서 하트를 누르면 로그인으로 유도하고 찜하지 않는다", async () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated" });

    render(<ContentCardActions content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "찜하기" }));

    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Fexplore");
    expect(screen.getByRole("button", { name: "찜하기" })).toBeInTheDocument();
  });
});
