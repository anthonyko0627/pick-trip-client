import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
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

import { TryItCard } from "./TryItCard";

const content: Content = {
  id: "42",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군 화개면 쌍계사길 59",
  summary: "천년 고찰",
  indoor: true,
};

describe("TryItCard", () => {
  beforeEach(() => {
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("제목·주소·카테고리 배지·지역 배지를 보여준다", () => {
    render(<TryItCard content={content} />);

    expect(screen.getByRole("heading", { name: "쌍계사" })).toBeInTheDocument();
    expect(
      screen.getByText("경남 하동군 화개면 쌍계사길 59"),
    ).toBeInTheDocument();
    expect(screen.getByText("문화")).toBeInTheDocument();
    expect(screen.getByText("하동")).toBeInTheDocument();
  });

  it("상세 링크가 from 파라미터 없이 /contents/{id}로 연결된다", () => {
    render(<TryItCard content={content} />);

    expect(
      screen.getByRole("heading", { name: "쌍계사" }).closest("a"),
    ).toHaveAttribute("href", "/contents/42");
  });

  it("담기 버튼이 바구니에 담는다", async () => {
    render(<TryItCard content={content} />);

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(useBasketStore.getState().items).toHaveLength(1);
  });
});
