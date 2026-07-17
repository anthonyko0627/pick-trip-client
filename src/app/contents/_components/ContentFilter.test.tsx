import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ContentFilter } from "./ContentFilter";

describe("ContentFilter", () => {
  it("6개 카테고리 칩을 렌더한다", () => {
    render(
      <ContentFilter
        selectedCategories={[]}
        keyword=""
        onCategoryChange={vi.fn()}
        onKeywordChange={vi.fn()}
      />,
    );

    for (const label of ["음식", "축제", "관광지", "문화", "자연", "체험"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("카테고리 칩 클릭 시 onCategoryChange를 호출한다", async () => {
    const onCategoryChange = vi.fn();
    render(
      <ContentFilter
        selectedCategories={[]}
        keyword=""
        onCategoryChange={onCategoryChange}
        onKeywordChange={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "음식" }));

    expect(onCategoryChange).toHaveBeenCalledWith(["FOOD"]);
  });

  it("선택된 카테고리 칩은 aria-pressed=true 속성을 갖는다", () => {
    render(
      <ContentFilter
        selectedCategories={["FOOD"]}
        keyword=""
        onCategoryChange={vi.fn()}
        onKeywordChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "음식" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "자연" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("검색어 입력 시 onKeywordChange를 호출한다", async () => {
    const onKeywordChange = vi.fn();
    render(
      <ContentFilter
        selectedCategories={[]}
        keyword=""
        onCategoryChange={vi.fn()}
        onKeywordChange={onKeywordChange}
      />,
    );

    await userEvent.type(screen.getByRole("searchbox"), "쌍");

    expect(onKeywordChange).toHaveBeenLastCalledWith("쌍");
  });
});
