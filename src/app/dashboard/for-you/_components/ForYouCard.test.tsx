import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard/for-you",
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated" }),
}));

import { useBasketStore } from "@/stores/basketStore";
import { useFavoriteStore } from "@/stores/favoriteStore";
import type { Content } from "@/types/content";

import { ForYouCard } from "./ForYouCard";

const stub: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군 화개면",
  summary: "천년 고찰, 봄이면 벚꽃이 만발한다",
  indoor: false,
};

describe("ForYouCard", () => {
  beforeEach(() => {
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
    useFavoriteStore.setState({ items: [], hydrated: true });
  });

  it("콘텐츠 이름/카테고리/주소/요약을 렌더한다", () => {
    render(<ForYouCard content={stub} />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("문화")).toBeInTheDocument();
    expect(screen.getByText("경남 하동군 화개면")).toBeInTheDocument();
    expect(
      screen.getByText("천년 고찰, 봄이면 벚꽃이 만발한다"),
    ).toBeInTheDocument();
  });

  it("지역 라벨을 썸네일 우상단 반투명 배지로 렌더한다", () => {
    render(<ForYouCard content={stub} />);

    const regionBadge = screen.getByText("하동");
    expect(regionBadge).toHaveClass("bg-white/90");
  });

  it("카드 본문이 from=for-you가 붙은 상세 페이지 링크를 포함한다", () => {
    render(<ForYouCard content={stub} />);

    expect(screen.getByRole("link", { name: /쌍계사/ })).toHaveAttribute(
      "href",
      "/contents/1?from=for-you",
    );
  });

  it("카드 본문 링크가 박스 전체를 덮는 stretched link다", () => {
    render(<ForYouCard content={stub} />);

    const link = screen.getByRole("link", { name: /쌍계사/ });
    expect(link).toHaveClass("after:absolute", "after:inset-0");
  });

  it("'상세 설명' 버튼 대신 찜/담기 액션을 렌더한다", () => {
    render(<ForYouCard content={stub} />);

    expect(
      screen.queryByRole("link", { name: "상세 설명" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "찜하기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "담기" })).toBeInTheDocument();
  });

  it("담기 버튼 클릭 시 바구니에 담긴다", async () => {
    render(<ForYouCard content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(useBasketStore.getState().items).toHaveLength(1);
  });
});
