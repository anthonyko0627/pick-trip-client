import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

import { useBasketStore } from "@/stores/basketStore";
import type { Content } from "@/types/content";

import { RegionSelectGrid } from "./RegionSelectGrid";

const stub: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

describe("RegionSelectGrid", () => {
  beforeEach(() => {
    push.mockClear();
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: false });
  });

  it("마운트 시 이전 여행 계획에서 남은 바구니를 비운다", () => {
    useBasketStore.setState({
      items: [{ content: stub, addedAt: Date.now(), priority: null }],
      hydrated: true,
    });

    render(<RegionSelectGrid />);

    expect(useBasketStore.getState().items).toHaveLength(0);
    expect(localStorage.getItem("pick-trip-basket")).toBeNull();
  });

  it("지역을 선택하지 않으면 다음 버튼이 비활성화된다", () => {
    render(<RegionSelectGrid />);
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  });

  it("지역을 선택하면 다음 버튼이 활성화되고, 클릭 시 선택한 지역으로 이동한다", async () => {
    render(<RegionSelectGrid />);

    await userEvent.click(screen.getByRole("button", { name: /하동/ }));
    const nextButton = screen.getByRole("button", { name: "다음" });
    expect(nextButton).toBeEnabled();

    await userEvent.click(nextButton);
    expect(push).toHaveBeenCalledWith("/select/conditions?regions=HADONG");
  });
});
