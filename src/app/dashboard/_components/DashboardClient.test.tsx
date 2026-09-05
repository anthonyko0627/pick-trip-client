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
import { useRecentViewsStore } from "@/stores/recentViewsStore";
import { useSavedItinerariesStore } from "@/stores/savedItinerariesStore";

import { DashboardClient } from "./DashboardClient";

describe("DashboardClient", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
    useSavedItinerariesStore.setState({ items: [], hydrated: true });
    useRecentViewsStore.setState({ items: [], hydrated: true });
  });

  it("unauthenticated면 아무것도 렌더하지 않고 '/'로 리다이렉트한다", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated", user: null });

    render(<DashboardClient recommendedPool={[]} />);

    expect(screen.queryByText(/안녕하세요/)).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("loading이면 아무것도 렌더하지 않고 리다이렉트하지 않는다", () => {
    mockUseAuth.mockReturnValue({ status: "loading", user: null });

    render(<DashboardClient recommendedPool={[]} />);

    expect(screen.queryByText(/안녕하세요/)).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("authenticated면 대시보드 콘텐츠를 렌더한다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { nickname: "김여행" },
    });

    render(<DashboardClient recommendedPool={[]} />);

    expect(screen.getByText("안녕하세요, 김여행님 👋")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
