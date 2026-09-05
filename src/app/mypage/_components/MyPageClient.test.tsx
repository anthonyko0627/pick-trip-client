import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
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
import { useSavedItinerariesStore } from "@/stores/savedItinerariesStore";
import type { Content } from "@/types/content";

import { MyPageClient } from "./MyPageClient";

const stubContent: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

function mockFavorites(items: Content[] = []) {
  mockUseFavorites.mockReturnValue({
    items,
    add: vi.fn(),
    remove: vi.fn(),
    isFavorited: () => false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    isAdding: false,
    isRemoving: false,
  });
}

describe("MyPageClient", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
    mockFavorites();
    useSavedItinerariesStore.setState({ items: [], hydrated: true });
  });

  it("unauthenticated면 아무것도 렌더하지 않고 '/'로 리다이렉트한다", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated", user: null });

    render(<MyPageClient />);

    expect(screen.queryByText("김여행")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("loading이면 아무것도 렌더하지 않고 리다이렉트하지 않는다", () => {
    mockUseAuth.mockReturnValue({ status: "loading", user: null });

    render(<MyPageClient />);

    expect(screen.queryByText("김여행")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("authenticated면 닉네임/이메일/가입일과 로그인 제공자 라벨을 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });

    render(<MyPageClient />);

    expect(screen.getByText("김여행")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getAllByText("카카오").length).toBeGreaterThan(0);
    expect(screen.getByText(/2026년 1월 15일/)).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("이메일이 없으면 이메일 항목을 표시하지 않는다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: null,
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });

    render(<MyPageClient />);

    expect(screen.queryByText("이메일")).not.toBeInTheDocument();
  });

  it("내 여행 바로가기 링크가 /itineraries를 가리킨다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });

    render(<MyPageClient />);

    expect(screen.getByRole("link", { name: /내 여행/ })).toHaveAttribute(
      "href",
      "/itineraries",
    );
  });

  it("찜한 콘텐츠/여행 바구니 링크 카드가 각 화면 개수를 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });
    mockFavorites([stubContent]);
    useBasketStore.setState({
      items: [{ content: stubContent, addedAt: Date.now(), priority: null }],
      hydrated: true,
    });

    render(<MyPageClient />);

    expect(screen.getByRole("link", { name: /찜한 콘텐츠/ })).toHaveAttribute(
      "href",
      "/favorites",
    );
    expect(screen.getByRole("link", { name: /여행 바구니/ })).toHaveAttribute(
      "href",
      "/basket",
    );
  });

  it("찜한 콘텐츠가 없으면 빈 상태 문구를 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });

    render(<MyPageClient />);

    expect(screen.getByText("아직 찜한 콘텐츠가 없습니다")).toBeInTheDocument();
  });

  it("찜한 콘텐츠가 있으면 미리보기 카드를 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });
    mockFavorites([stubContent]);

    render(<MyPageClient />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
  });

  it("최근 찜한 순 4개만 미리보기로 보여주고, 4개 초과면 더보기 링크가 나온다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });
    // add 순서대로 뒤에 쌓이므로 place-5가 가장 최근 찜이다.
    mockFavorites(
      [1, 2, 3, 4, 5].map((n) => ({
        ...stubContent,
        id: `${n}`,
        name: `place-${n}`,
      })),
    );

    render(<MyPageClient />);

    // 최근 4개(place-5..place-2)만 노출, 가장 오래된 place-1은 빠진다.
    expect(screen.getByText("place-5")).toBeInTheDocument();
    expect(screen.getByText("place-2")).toBeInTheDocument();
    expect(screen.queryByText("place-1")).not.toBeInTheDocument();

    expect(screen.getByRole("link", { name: "더보기 →" })).toHaveAttribute(
      "href",
      "/favorites",
    );
  });

  it("찜한 콘텐츠가 4개 이하면 더보기 링크를 보여주지 않는다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-15T00:00:00Z",
      },
    });
    mockFavorites(
      [1, 2, 3, 4].map((n) => ({
        ...stubContent,
        id: `${n}`,
        name: `place-${n}`,
      })),
    );

    render(<MyPageClient />);

    expect(
      screen.queryByRole("link", { name: "더보기 →" }),
    ).not.toBeInTheDocument();
  });
});
