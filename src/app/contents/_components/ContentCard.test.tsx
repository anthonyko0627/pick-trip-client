import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

const defaultProps = {
  isInBasket: false as const,
  onToggleBasket: vi.fn(),
};

describe("ContentCard", () => {
  it("콘텐츠 이름을 렌더한다", () => {
    render(<ContentCard content={stub} {...defaultProps} />);
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
  });

  it("카테고리 한글 라벨을 렌더한다", () => {
    render(<ContentCard content={stub} {...defaultProps} />);
    expect(screen.getByText("문화")).toBeInTheDocument();
  });

  it("주소를 렌더한다", () => {
    render(<ContentCard content={stub} {...defaultProps} />);
    expect(screen.getByText("경남 하동군 화개면")).toBeInTheDocument();
  });

  it("요약 설명을 렌더한다", () => {
    render(<ContentCard content={stub} {...defaultProps} />);
    expect(
      screen.getByText("천년 고찰, 봄이면 벚꽃이 만발한다"),
    ).toBeInTheDocument();
  });

  it("isInBasket=false이면 '담기' 버튼을 렌더한다", () => {
    render(
      <ContentCard
        content={stub}
        isInBasket={false}
        onToggleBasket={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "담기" })).toBeInTheDocument();
  });

  it("isInBasket=true이면 '담김' 버튼을 렌더한다", () => {
    render(
      <ContentCard content={stub} isInBasket={true} onToggleBasket={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "담김" })).toBeInTheDocument();
  });

  it("담기 버튼 클릭 시 onToggleBasket을 호출한다", async () => {
    const onToggle = vi.fn();
    render(
      <ContentCard
        content={stub}
        isInBasket={false}
        onToggleBasket={onToggle}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "담기" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("카드 본문이 상세 페이지 링크를 포함한다", () => {
    render(
      <ContentCard
        content={stub}
        isInBasket={false}
        onToggleBasket={vi.fn()}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/contents/1");
  });
});
