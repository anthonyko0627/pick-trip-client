import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { useBasketStore } from "@/stores/basketStore";
import type { Content } from "@/types/content";

import { BasketLayout } from "./BasketLayout";

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

describe("BasketLayout", () => {
  beforeEach(() => {
    mockPush.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: true });
  });

  it("children을 렌더한다", () => {
    render(
      <BasketLayout generateHref="/select/conditions?regions=HADONG">
        <p>본문 콘텐츠</p>
      </BasketLayout>,
    );

    expect(screen.getByText("본문 콘텐츠")).toBeInTheDocument();
  });

  it("바구니에 담긴 콘텐츠 개수를 패널과 FAB에 표시한다", () => {
    useBasketStore.setState({
      items: [
        {
          content: makeContent({ id: "1" }),
          addedAt: 1,
          priority: null,
          desiredStayMinutes: null,
        },
        {
          content: makeContent({ id: "2" }),
          addedAt: 2,
          priority: null,
          desiredStayMinutes: null,
        },
      ],
      hydrated: true,
    });

    render(
      <BasketLayout generateHref="/select/conditions?regions=HADONG">
        <p>본문</p>
      </BasketLayout>,
    );

    expect(screen.getAllByText("2개").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "여행 바구니 열기" }),
    ).toBeInTheDocument();
  });

  it("바구니가 2개 미만이면 AI 일정 생성 버튼이 비활성화된다", () => {
    useBasketStore.setState({
      items: [
        {
          content: makeContent({ id: "1" }),
          addedAt: 1,
          priority: null,
          desiredStayMinutes: null,
        },
      ],
      hydrated: true,
    });

    render(
      <BasketLayout generateHref="/select/conditions?regions=HADONG">
        <p>본문</p>
      </BasketLayout>,
    );

    expect(
      screen.getAllByRole("button", { name: "AI 일정 생성" })[0],
    ).toBeDisabled();
  });

  it("바구니가 2개 이상이면 AI 일정 생성 버튼 클릭 시 generateHref로 이동한다", async () => {
    useBasketStore.setState({
      items: [
        {
          content: makeContent({ id: "1" }),
          addedAt: 1,
          priority: null,
          desiredStayMinutes: null,
        },
        {
          content: makeContent({ id: "2" }),
          addedAt: 2,
          priority: null,
          desiredStayMinutes: null,
        },
      ],
      hydrated: true,
    });

    render(
      <BasketLayout generateHref="/select/conditions?regions=HADONG">
        <p>본문</p>
      </BasketLayout>,
    );

    await userEvent.click(
      screen.getAllByRole("button", { name: "AI 일정 생성" })[0],
    );

    expect(mockPush).toHaveBeenCalledWith("/select/conditions?regions=HADONG");
  });

  it("FAB 클릭 시 모바일 드로어가 열린다", async () => {
    render(
      <BasketLayout generateHref="/select/conditions?regions=HADONG">
        <p>본문</p>
      </BasketLayout>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "여행 바구니 열기" }),
    );

    expect(screen.getByTestId("basket-drawer-overlay")).toHaveClass(
      "pointer-events-auto",
    );
  });
});
