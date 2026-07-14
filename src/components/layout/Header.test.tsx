import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/contents",
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

import { Header } from "./Header";

describe("Header", () => {
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

  it("로그인 상태에서는 닉네임과 로그아웃 버튼을 보여주고, 클릭 시 logout을 호출한다", async () => {
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
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(logout).toHaveBeenCalled();
  });
});
