import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Day } from "@/types/itinerary";
import { DayCard } from "./DayCard";

const makeDay = (overrides: Partial<Day> = {}): Day => ({
  dayId: "day-1",
  dayIndex: 1,
  items: [
    {
      itemId: "item-1",
      contentId: "content-1",
      title: "쌍계사",
      order: 0,
      reason: "지역 대표 명소",
      pinned: false,
    },
  ],
  ...overrides,
});

describe("DayCard", () => {
  it("dayIndex 1을 1일차로 표시한다", () => {
    render(<DayCard day={makeDay({ dayIndex: 1 })} />);

    expect(screen.getByText("1일차")).toBeInTheDocument();
  });

  it("dayIndex 2를 2일차로 표시한다", () => {
    render(<DayCard day={makeDay({ dayIndex: 2 })} />);

    expect(screen.getByText("2일차")).toBeInTheDocument();
  });

  it("day의 모든 장소를 렌더한다", () => {
    render(
      <DayCard
        day={makeDay({
          items: [
            {
              itemId: "item-1",
              contentId: "content-1",
              title: "쌍계사",
              order: 0,
              reason: "",
              pinned: false,
            },
            {
              itemId: "item-2",
              contentId: "content-2",
              title: "화개장터",
              order: 1,
              reason: "",
              pinned: false,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("화개장터")).toBeInTheDocument();
  });

  it("첫 항목은 위로 이동 버튼이, 마지막 항목은 아래로 이동 버튼이 비활성화된다", () => {
    render(
      <DayCard
        day={makeDay({
          items: [
            {
              itemId: "item-1",
              contentId: "content-1",
              title: "쌍계사",
              order: 0,
              reason: "",
              pinned: false,
            },
            {
              itemId: "item-2",
              contentId: "content-2",
              title: "화개장터",
              order: 1,
              reason: "",
              pinned: false,
            },
          ],
        })}
        onMoveItem={vi.fn()}
      />,
    );

    const upButtons = screen.getAllByRole("button", { name: "위로 이동" });
    const downButtons = screen.getAllByRole("button", { name: "아래로 이동" });

    expect(upButtons[0]).toBeDisabled();
    expect(downButtons[0]).toBeEnabled();
    expect(upButtons[1]).toBeEnabled();
    expect(downButtons[1]).toBeDisabled();
  });

  it("항목의 위로 이동 버튼 클릭 시 dayId/itemId를 바인딩해 onMoveItem을 호출한다", async () => {
    const onMoveItem = vi.fn();
    render(
      <DayCard
        day={makeDay({
          dayId: "day-9",
          items: [
            {
              itemId: "item-2",
              contentId: "content-2",
              title: "화개장터",
              order: 1,
              reason: "",
              pinned: false,
            },
            {
              itemId: "item-1",
              contentId: "content-1",
              title: "쌍계사",
              order: 0,
              reason: "",
              pinned: false,
            },
          ],
        })}
        onMoveItem={onMoveItem}
      />,
    );

    const downButtons = screen.getAllByRole("button", { name: "아래로 이동" });
    await userEvent.click(downButtons[0]);

    expect(onMoveItem).toHaveBeenCalledWith("day-9", "item-2", "down");
  });

  it("편집 콜백이 없으면 컨트롤 버튼을 렌더하지 않는다", () => {
    render(<DayCard day={makeDay()} />);

    expect(
      screen.queryByRole("button", { name: "위로 이동" }),
    ).not.toBeInTheDocument();
  });
});
