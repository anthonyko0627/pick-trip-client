import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { BasketItem, BasketPriority } from "@/types/basket";

import { BasketPanel } from "./BasketPanel";

const makeItem = (
  id: string,
  name: string,
  priority: BasketPriority | null = null,
): BasketItem => ({
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
  priority,
});

const defaultProps = {
  onRemove: vi.fn(),
  onSetPriority: vi.fn(),
  onClear: vi.fn(),
  canGenerate: false,
  onGenerate: vi.fn(),
};

describe("BasketPanel", () => {
  it("담긴 콘텐츠가 없으면 빈 상태 메시지를 렌더한다", () => {
    render(<BasketPanel items={[]} {...defaultProps} />);
    expect(screen.getByText(/담은 콘텐츠가 없습니다/)).toBeInTheDocument();
  });

  it("담긴 콘텐츠 이름 목록을 렌더한다", () => {
    const items = [makeItem("1", "쌍계사"), makeItem("2", "화개장터")];
    render(<BasketPanel items={items} {...defaultProps} />);
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("화개장터")).toBeInTheDocument();
  });

  it("삭제 버튼 클릭 시 onRemove를 해당 id로 호출한다", async () => {
    const onRemove = vi.fn();
    const items = [makeItem("1", "쌍계사")];
    render(
      <BasketPanel
        items={items}
        onRemove={onRemove}
        onSetPriority={vi.fn()}
        onClear={vi.fn()}
        canGenerate={false}
        onGenerate={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /삭제/ }));
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("담긴 콘텐츠 수를 헤더에 표시한다", () => {
    const items = [makeItem("1", "쌍계사"), makeItem("2", "화개장터")];
    render(<BasketPanel items={items} {...defaultProps} />);
    expect(
      screen.getByRole("heading", { name: /여행 바구니 2개/ }),
    ).toBeInTheDocument();
  });

  it("각 항목에 3개 우선순위 버튼을 렌더한다", () => {
    const items = [makeItem("1", "쌍계사")];
    render(<BasketPanel items={items} {...defaultProps} />);
    expect(screen.getByRole("button", { name: "꼭 가기" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "가면 좋음" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "시간 남으면" }),
    ).toBeInTheDocument();
  });

  it("비활성 우선순위 버튼 클릭 시 onSetPriority에 해당 레벨을 전달한다", async () => {
    const onSetPriority = vi.fn();
    const items = [makeItem("1", "쌍계사", null)];
    render(
      <BasketPanel
        items={items}
        onRemove={vi.fn()}
        onSetPriority={onSetPriority}
        onClear={vi.fn()}
        canGenerate={false}
        onGenerate={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "꼭 가기" }));
    expect(onSetPriority).toHaveBeenCalledWith("1", "MUST");
  });

  it("활성 우선순위 버튼 재클릭 시 onSetPriority에 null을 전달한다", async () => {
    const onSetPriority = vi.fn();
    const items = [makeItem("1", "쌍계사", "MUST")];
    render(
      <BasketPanel
        items={items}
        onRemove={vi.fn()}
        onSetPriority={onSetPriority}
        onClear={vi.fn()}
        canGenerate={false}
        onGenerate={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "꼭 가기" }));
    expect(onSetPriority).toHaveBeenCalledWith("1", null);
  });

  it("항목이 있으면 전체 비우기 버튼을 렌더한다", () => {
    const items = [makeItem("1", "쌍계사")];
    render(<BasketPanel items={items} {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "전체 비우기" }),
    ).toBeInTheDocument();
  });

  it("항목이 없으면 전체 비우기 버튼이 없다", () => {
    render(<BasketPanel items={[]} {...defaultProps} />);
    expect(
      screen.queryByRole("button", { name: "전체 비우기" }),
    ).not.toBeInTheDocument();
  });

  it("전체 비우기 버튼 클릭 시 onClear를 호출한다", async () => {
    const onClear = vi.fn();
    const items = [makeItem("1", "쌍계사")];
    render(
      <BasketPanel
        items={items}
        onRemove={vi.fn()}
        onSetPriority={vi.fn()}
        onClear={onClear}
        canGenerate={false}
        onGenerate={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "전체 비우기" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("canGenerate=false이면 AI 일정 생성 버튼이 비활성화된다", () => {
    render(<BasketPanel items={[]} {...defaultProps} canGenerate={false} />);
    expect(screen.getByRole("button", { name: "AI 일정 생성" })).toBeDisabled();
  });

  it("canGenerate=true이면 AI 일정 생성 버튼이 활성화된다", () => {
    render(<BasketPanel items={[]} {...defaultProps} canGenerate={true} />);
    expect(screen.getByRole("button", { name: "AI 일정 생성" })).toBeEnabled();
  });

  it("AI 일정 생성 버튼 클릭 시 onGenerate를 호출한다", async () => {
    const onGenerate = vi.fn();
    render(
      <BasketPanel
        items={[]}
        {...defaultProps}
        canGenerate={true}
        onGenerate={onGenerate}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "AI 일정 생성" }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });
});
