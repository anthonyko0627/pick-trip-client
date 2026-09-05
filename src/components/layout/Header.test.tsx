import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.fn(() => "/contents");
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: mockPush }),
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
import type { BasketItem } from "@/types/basket";
import type { Content } from "@/types/content";

import { Header } from "./Header";

const makeBasketItem = (id: string): BasketItem => ({
  content: {
    id,
    name: `콘텐츠 ${id}`,
    region: "HADONG",
    category: "CULTURE",
    imageUrl: null,
    address: "경남 하동군",
    summary: "요약",
    indoor: false,
  },
  addedAt: Date.now(),
  priority: null,
});

const makeFavoriteContent = (id: string): Content => ({
  id,
  name: `콘텐츠 ${id}`,
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "요약",
  indoor: false,
});

describe("Header", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/contents");
    mockPush.mockClear();
    // 바구니는 전역 스토어라 테스트 간 상태가 누수되므로 초기화한다.
    useBasketStore.setState({ items: [], hydrated: true });
    mockUseFavorites.mockReturnValue({
      items: [] as Content[],
      add: vi.fn(),
      remove: vi.fn(),
      isFavorited: () => false,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isAdding: false,
      isRemoving: false,
    });
  });

  it("일정 공유 페이지에서는 헤더를 렌더링하지 않는다", () => {
    mockUsePathname.mockReturnValue("/share/abc123");
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    const { container } = render(<Header />);

    expect(container).toBeEmptyDOMElement();
  });

  it("로그인 페이지에서는 헤더를 렌더링하지 않는다", () => {
    mockUsePathname.mockReturnValue("/login");
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    const { container } = render(<Header />);

    expect(container).toBeEmptyDOMElement();
  });

  it("로딩 상태에서는 로그인/로그아웃 컨트롤을 보여주지 않는다", () => {
    mockUseAuth.mockReturnValue({
      status: "loading",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    expect(
      screen.queryByRole("link", { name: "로그인" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "로그아웃" }),
    ).not.toBeInTheDocument();
  });

  it("비로그인 상태에서는 현재 경로를 next로 담은 로그인 링크를 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    const loginLink = screen.getByRole("link", { name: "로그인" });
    expect(loginLink).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent("/contents")}`,
    );
  });

  it.each([
    "/explore",
    "/select/conditions",
    "/itinerary",
  ])("%s 경로에서는 로그인 후 콘텐츠 탐색/AI일정 흐름 대신 대시보드로 보내도록 next를 고정한다", (pathname) => {
    mockUsePathname.mockReturnValue(pathname);
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    const loginLink = screen.getByRole("link", { name: "로그인" });
    expect(loginLink).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent("/dashboard")}`,
    );
  });

  it("/exploredetail처럼 콘텐츠 탐색과 무관한 경로는 대시보드로 고정하지 않는다", () => {
    mockUsePathname.mockReturnValue("/exploredetail");
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    const loginLink = screen.getByRole("link", { name: "로그인" });
    expect(loginLink).toHaveAttribute(
      "href",
      `/login?next=${encodeURIComponent("/exploredetail")}`,
    );
  });

  it("로그인 상태에서는 닉네임 드롭다운을 보여주고, 로그아웃 클릭 시 logout을 호출하고 홈으로 이동한다", async () => {
    const logout = vi.fn();
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout,
    });

    render(<Header />);

    expect(screen.getByText("김여행")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /김여행/ }));
    await userEvent.click(
      await screen.findByRole("menuitem", { name: "로그아웃" }),
    );
    expect(logout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("홈/콘텐츠 탐색/AI일정 네비게이션 링크를 올바른 href로 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "콘텐츠 탐색" })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.getByRole("link", { name: "AI일정" })).toHaveAttribute(
      "href",
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
  });

  it("현재 경로와 일치하는 nav 항목만 활성 상태로 표시한다", () => {
    mockUsePathname.mockReturnValue("/select/conditions");
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByRole("link", { name: "AI일정" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "홈" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("link", { name: "콘텐츠 탐색" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("/exploredetail 경로에서는 콘텐츠 탐색(/explore) 링크를 활성화하지 않는다", () => {
    mockUsePathname.mockReturnValue("/exploredetail");
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    expect(
      screen.getByRole("link", { name: "콘텐츠 탐색" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("비로그인 상태에서는 마이페이지 링크와 바구니 아이콘을 보여주지 않는다", () => {
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    expect(
      screen.queryByRole("link", { name: "마이페이지" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /바구니/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /찜한 콘텐츠/ }),
    ).not.toBeInTheDocument();
  });

  it("로그인 상태에서는 드롭다운의 마이페이지 링크가 /mypage를 가리킨다", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    await userEvent.click(screen.getByRole("button", { name: /김여행/ }));

    expect(
      await screen.findByRole("menuitem", { name: "마이페이지" }),
    ).toHaveAttribute("href", "/mypage");
  });

  it("로그인 상태에서도 홈/콘텐츠 탐색/AI일정 링크가 그대로 보이고 대시보드 링크가 추가로 보인다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "콘텐츠 탐색" })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.getByRole("link", { name: "AI일정" })).toHaveAttribute(
      "href",
      "/select/conditions?regions=HADONG,YEONGJU,YECHEON",
    );
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("로그인 상태에서는 드롭다운에 /favorites로 이동하는 찜한 콘텐츠 링크가 있다", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    await userEvent.click(screen.getByRole("button", { name: /김여행/ }));

    expect(
      await screen.findByRole("menuitem", { name: "찜한 콘텐츠" }),
    ).toHaveAttribute("href", "/favorites");
  });

  it("비로그인 상태에서는 닉네임 드롭다운(과 찜한 콘텐츠 링크)을 보여주지 않는다", () => {
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      user: null,
      logout: vi.fn(),
    });

    render(<Header />);

    expect(
      screen.queryByRole("menuitem", { name: "찜한 콘텐츠" }),
    ).not.toBeInTheDocument();
  });

  it("로그인 상태에서는 /basket으로 이동하는 바구니 아이콘을 보여준다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByRole("link", { name: /바구니/ })).toHaveAttribute(
      "href",
      "/basket",
    );
  });

  it("바구니 아이콘에 마우스를 올리면 '장바구니' 툴팁이 뜬다", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    await userEvent.hover(screen.getByRole("link", { name: /바구니/ }));

    expect((await screen.findAllByText("장바구니")).length).toBeGreaterThan(0);
  });

  it("바구니가 비어있으면 개수 배지를 보여주지 않는다", () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("바구니에 담긴 콘텐츠가 있으면 개수 배지를 보여준다", () => {
    useBasketStore.setState({
      items: [makeBasketItem("1"), makeBasketItem("2")],
      hydrated: true,
    });
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("드롭다운의 찜한 콘텐츠가 0개면 개수 배지를 보여주지 않는다", async () => {
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    await userEvent.click(screen.getByRole("button", { name: /김여행/ }));
    await screen.findByRole("menuitem", { name: "찜한 콘텐츠" });

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("드롭다운의 찜한 콘텐츠가 1개 이상이면 카톡 알림 스타일 개수 배지를 보여준다", async () => {
    mockUseFavorites.mockReturnValue({
      items: [makeFavoriteContent("1"), makeFavoriteContent("2")],
      add: vi.fn(),
      remove: vi.fn(),
      isFavorited: () => false,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
      isAdding: false,
      isRemoving: false,
    });
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      user: {
        uid: "uid-1",
        email: "user@example.com",
        nickname: "김여행",
        profileImageUrl: "",
        provider: "KAKAO",
        createdAt: "2026-01-01T00:00:00Z",
      },
      logout: vi.fn(),
    });

    render(<Header />);

    await userEvent.click(screen.getByRole("button", { name: /김여행/ }));

    expect(
      await screen.findByRole("menuitem", { name: /찜한 콘텐츠/ }),
    ).toHaveTextContent("2");
  });
});
