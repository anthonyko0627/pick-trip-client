import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("자식 텍스트를 버튼으로 렌더링한다", () => {
    render(<Button>일정 만들기</Button>);

    expect(
      screen.getByRole("button", { name: "일정 만들기" }),
    ).toBeInTheDocument();
  });

  it("variant와 size를 data 속성으로 반영한다", () => {
    render(
      <Button variant="outline" size="sm">
        취소
      </Button>,
    );

    const button = screen.getByRole("button", { name: "취소" });
    expect(button).toHaveAttribute("data-variant", "outline");
    expect(button).toHaveAttribute("data-size", "sm");
  });

  it("asChild로 다른 요소에 버튼 스타일을 위임한다", () => {
    render(
      <Button asChild>
        <a href="/contents">콘텐츠 보기</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "콘텐츠 보기" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/contents");
  });
});
