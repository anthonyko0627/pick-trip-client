import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BasketItem } from "@/types/basket";

import { BasketDrawer } from "./BasketDrawer";

const makeItem = (id: string, name: string): BasketItem => ({
  content: {
    id,
    name,
    region: "HADONG",
    category: "CULTURE",
    imageUrl: null,
    address: "경남 하동군",
    summary: "요약",
    indoor: false,
  },
  addedAt: Date.now(),
  priority: null,
  desiredStayMinutes: null,
});

const defaultProps = {
  isOpen: false,
  onClose: vi.fn(),
  items: [],
  onRemove: vi.fn(),
  onSetPriority: vi.fn(),
  onClear: vi.fn(),
  canGenerate: false,
  onGenerate: vi.fn(),
};

describe("BasketDrawer", () => {
  it("isOpen=true일 때 항목 목록을 렌더한다", () => {
    const items = [makeItem("1", "쌍계사")];
    render(<BasketDrawer {...defaultProps} isOpen={true} items={items} />);
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
  });

  it("isOpen=false일 때도 DOM에 존재하지만 pointer-events가 없다", () => {
    render(<BasketDrawer {...defaultProps} isOpen={false} />);
    const wrapper = screen.getByTestId("basket-drawer-overlay");
    expect(wrapper).toHaveClass("pointer-events-none");
  });

  it("isOpen=true일 때 pointer-events가 활성화된다", () => {
    render(<BasketDrawer {...defaultProps} isOpen={true} />);
    const wrapper = screen.getByTestId("basket-drawer-overlay");
    expect(wrapper).toHaveClass("pointer-events-auto");
  });

  it("오버레이 클릭 시 onClose를 호출한다", async () => {
    const onClose = vi.fn();
    render(<BasketDrawer {...defaultProps} isOpen={true} onClose={onClose} />);
    await userEvent.click(screen.getByTestId("basket-drawer-backdrop"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("전체 비우기 버튼 클릭 시 onClear를 호출한다", async () => {
    const onClear = vi.fn();
    const items = [makeItem("1", "쌍계사")];
    render(
      <BasketDrawer
        {...defaultProps}
        isOpen={true}
        items={items}
        onClear={onClear}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "전체 비우기" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("canGenerate=false이면 AI 일정 생성 버튼이 비활성화된다", () => {
    render(
      <BasketDrawer {...defaultProps} isOpen={true} canGenerate={false} />,
    );
    expect(screen.getByRole("button", { name: "AI 일정 생성" })).toBeDisabled();
  });

  it("canGenerate=true이면 AI 일정 생성 버튼이 활성화된다", () => {
    render(<BasketDrawer {...defaultProps} isOpen={true} canGenerate={true} />);
    expect(screen.getByRole("button", { name: "AI 일정 생성" })).toBeEnabled();
  });

  it("AI 일정 생성 버튼 클릭 시 onGenerate를 호출한다", async () => {
    const onGenerate = vi.fn();
    render(
      <BasketDrawer
        {...defaultProps}
        isOpen={true}
        canGenerate={true}
        onGenerate={onGenerate}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "AI 일정 생성" }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});
