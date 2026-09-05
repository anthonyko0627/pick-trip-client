import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/contents",
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated" }),
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

import { ContentCard } from "./ContentCard";

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

describe("ContentCard", () => {
  beforeEach(() => {
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("콘텐츠 이름/카테고리/주소/요약/지역을 렌더한다", () => {
    render(<ContentCard content={stub} />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("문화")).toBeInTheDocument();
    expect(screen.getByText("경남 하동군 화개면")).toBeInTheDocument();
    expect(
      screen.getByText("천년 고찰, 봄이면 벚꽃이 만발한다"),
    ).toBeInTheDocument();
    expect(screen.getByText("하동")).toBeInTheDocument();
  });

  it("지역 배지를 썸네일 우상단에 반투명 배지로 렌더한다", () => {
    render(<ContentCard content={stub} />);

    const regionBadge = screen.getByText("하동");
    expect(regionBadge).toHaveClass("bg-white/90");
  });

  it("담기지 않은 상태면 '담기' 버튼을 렌더한다", () => {
    render(<ContentCard content={stub} />);
    expect(screen.getByRole("button", { name: "담기" })).toBeInTheDocument();
  });

  it("담기 버튼 클릭 시 바구니에 담긴다", async () => {
    render(<ContentCard content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(useBasketStore.getState().items).toHaveLength(1);
    expect(screen.getByRole("button", { name: "담김" })).toBeInTheDocument();
  });

  it("카드 본문이 상세 페이지 링크를 포함한다", () => {
    render(<ContentCard content={stub} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/contents/1");
  });
});
