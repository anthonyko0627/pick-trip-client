import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { TravelDateForm } from "./TravelDateForm";

function fillDateAndDuration() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

describe("TravelDateForm — 동행 조건", () => {
  it("동행 조건 선택 섹션이 화면에 렌더된다", () => {
    render(<TravelDateForm regions="HADONG" />);

    expect(screen.getByText("동행 조건")).toBeInTheDocument();
  });

  it("동행 조건을 선택하지 않아도 날짜·기간 입력 시 다음 버튼이 활성화된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    const dateInput = screen.getByLabelText(/출발 날짜/);
    await userEvent.type(dateInput, fillDateAndDuration());
    await userEvent.click(screen.getByRole("button", { name: "당일치기" }));

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("동행 조건 선택 시 URL에 companions 파라미터가 포함된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    const dateInput = screen.getByLabelText(/출발 날짜/);
    const date = fillDateAndDuration();
    await userEvent.type(dateInput, date);
    await userEvent.click(screen.getByRole("button", { name: "당일치기" }));
    await userEvent.click(screen.getByRole("button", { name: "아이와 함께" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("companions=WITH_KIDS"),
    );
  });

  it("동행 조건 미선택 시 URL에 companions 파라미터가 없다", async () => {
    mockPush.mockClear();
    render(<TravelDateForm regions="HADONG" />);

    const dateInput = screen.getByLabelText(/출발 날짜/);
    const date = fillDateAndDuration();
    await userEvent.type(dateInput, date);
    await userEvent.click(screen.getByRole("button", { name: "당일치기" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(mockPush).toHaveBeenCalledWith(
      expect.not.stringContaining("companions"),
    );
  });
});
