import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { COMPANION_CONDITIONS } from "@/types/travel-condition";

import { CompanionSelector } from "./CompanionSelector";

describe("CompanionSelector", () => {
  it("8개 동행 조건 태그를 모두 렌더한다", () => {
    render(<CompanionSelector value={[]} onChange={vi.fn()} />);

    for (const condition of COMPANION_CONDITIONS) {
      expect(
        screen.getByRole("button", { name: condition.label }),
      ).toBeInTheDocument();
    }
  });

  it("태그 클릭 시 해당 조건이 선택 목록에 추가된다", async () => {
    const onChange = vi.fn();
    render(<CompanionSelector value={[]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "아이와 함께" }));

    expect(onChange).toHaveBeenCalledWith(["WITH_KIDS"]);
  });

  it("이미 선택된 태그를 클릭하면 선택이 해제된다", async () => {
    const onChange = vi.fn();
    render(<CompanionSelector value={["WITH_KIDS"]} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "아이와 함께" }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("여러 태그를 동시에 선택할 수 있다", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CompanionSelector value={[]} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "자연 위주" }));
    rerender(
      <CompanionSelector value={["NATURE_FOCUSED"]} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "음식 위주" }));

    expect(onChange).toHaveBeenLastCalledWith([
      "NATURE_FOCUSED",
      "FOOD_FOCUSED",
    ]);
  });

  it("선택된 태그는 aria-pressed=true 속성을 갖는다", () => {
    render(<CompanionSelector value={["WITH_KIDS"]} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "아이와 함께" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "자연 위주" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
