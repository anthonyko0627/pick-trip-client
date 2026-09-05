import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/dashboard/for-you",
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/services/contentService", () => ({
  getContents: vi.fn(),
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

import { ForYouClient } from "./ForYouClient";

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

const queryParams = {
  regions: ["HADONG", "YEONGJU", "YECHEON"],
  startDate: "2026-06-20",
  nights: 0,
};

function renderForYouClient(initialContents: Content[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ForYouClient
        initialContents={initialContents}
        initialTotal={initialContents.length}
        queryParams={queryParams}
      />
    </QueryClientProvider>,
  );
}

describe("ForYouClient", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("unauthenticated면 아무것도 렌더하지 않고 '/'로 리다이렉트한다", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated", user: null });

    renderForYouClient([makeContent()]);

    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("loading이면 아무것도 렌더하지 않고 리다이렉트하지 않는다", () => {
    mockUseAuth.mockReturnValue({ status: "loading", user: null });

    renderForYouClient([makeContent()]);

    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("authenticated면 추천 콘텐츠 그리드를 렌더한다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { nickname: "김여행" },
    });

    renderForYouClient([makeContent()]);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("담긴 콘텐츠가 2개 이상이면 AI 일정 생성 클릭 시 조건 입력 페이지로 이동한다", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: { nickname: "김여행" },
    });
    useBasketStore.setState({
      items: [
        { content: makeContent({ id: "1" }), addedAt: 1, priority: null },
        { content: makeContent({ id: "2" }), addedAt: 2, priority: null },
      ],
      hydrated: true,
    });

    renderForYouClient([makeContent()]);

    await userEvent.click(
      screen.getAllByRole("button", { name: "AI 일정 생성" })[0],
    );

    expect(mockPush).toHaveBeenCalledWith(
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
  });
});
