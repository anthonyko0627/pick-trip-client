import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/favorites",
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseFavorites = vi.fn();
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => mockUseFavorites(),
}));

import { useBasketStore } from "@/stores/basketStore";
import type { Content } from "@/types/content";

import { FavoritesClient } from "./FavoritesClient";

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

const mockRefetch = vi.fn();

function baseFavorites() {
  return {
    items: [] as Content[],
    add: vi.fn(),
    remove: vi.fn(),
    isFavorited: () => false,
    isLoading: false,
    isError: false,
    refetch: mockRefetch,
    isAdding: false,
    isRemoving: false,
  };
}

function mockFavorites(
  overrides: Partial<ReturnType<typeof baseFavorites>> = {},
) {
  mockUseFavorites.mockReturnValue({ ...baseFavorites(), ...overrides });
}

describe("FavoritesClient", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockRefetch.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
    mockFavorites();
  });

  it("unauthenticated면 아무것도 렌더하지 않고 '/'로 리다이렉트한다", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated", user: null });

    render(<FavoritesClient />);

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("로딩 중이면 스켈레톤을 보여준다", () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", user: null });
    mockFavorites({ isLoading: true });

    render(<FavoritesClient />);

    expect(screen.getByTestId("favorites-loading")).toBeInTheDocument();
    expect(
      screen.queryByText("아직 찜한 콘텐츠가 없습니다"),
    ).not.toBeInTheDocument();
  });

  it("에러가 있으면 에러 메시지와 재시도 버튼을 보여준다", async () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", user: null });
    mockFavorites({ isError: true });

    render(<FavoritesClient />);

    expect(
      screen.getByText(/찜한 콘텐츠를 불러오지 못했습니다/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("찜한 콘텐츠가 없으면 빈 상태 안내를 렌더한다", () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", user: null });

    render(<FavoritesClient />);

    expect(screen.getByText("아직 찜한 콘텐츠가 없습니다")).toBeInTheDocument();
  });

  it("찜한 콘텐츠를 카드로 렌더하고 상세 페이지 링크에 from=favorites를 붙인다", () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", user: null });
    mockFavorites({ items: [makeContent({ id: "1", name: "쌍계사" })] });

    render(<FavoritesClient />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /쌍계사/ })).toHaveAttribute(
      "href",
      "/contents/1?from=favorites",
    );
  });

  it("가장 최근에 찜한 콘텐츠를 목록 맨 앞에 보여준다", () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", user: null });
    mockFavorites({
      items: [
        makeContent({ id: "1", name: "쌍계사" }),
        makeContent({ id: "2", name: "화개장터" }),
      ],
    });

    render(<FavoritesClient />);

    const names = screen
      .getAllByRole("heading", { level: 3 })
      .map((el) => el.textContent);
    expect(names).toEqual(["화개장터", "쌍계사"]);
  });

  it("담긴 콘텐츠가 2개 이상이면 AI 일정 생성 클릭 시 조건 입력 페이지로 이동한다", async () => {
    mockUseAuth.mockReturnValue({ status: "authenticated", user: null });
    useBasketStore.setState({
      items: [
        { content: makeContent({ id: "1" }), addedAt: 1, priority: null },
        { content: makeContent({ id: "2" }), addedAt: 2, priority: null },
      ],
      hydrated: true,
    });

    render(<FavoritesClient />);

    await userEvent.click(
      screen.getAllByRole("button", { name: "AI 일정 생성" })[0],
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
  });
});
