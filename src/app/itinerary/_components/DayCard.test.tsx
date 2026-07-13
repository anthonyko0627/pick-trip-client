import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Day } from "@/types/itinerary";
import { DayCard } from "./DayCard";

const makeDay = (overrides: Partial<Day> = {}): Day => ({
  dayId: "day-1",
  dayIndex: 0,
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
  it("dayIndex 0을 1일차로 표시한다", () => {
    render(<DayCard day={makeDay({ dayIndex: 0 })} />);

    expect(screen.getByText("1일차")).toBeInTheDocument();
  });

  it("dayIndex 1을 2일차로 표시한다", () => {
    render(<DayCard day={makeDay({ dayIndex: 1 })} />);

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
});
