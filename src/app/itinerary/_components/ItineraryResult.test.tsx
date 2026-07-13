import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Day } from "@/types/itinerary";
import { ItineraryResult } from "./ItineraryResult";

const makeDay = (overrides: Partial<Day> = {}): Day => ({
  dayId: "day-1",
  dayIndex: 0,
  items: [
    {
      itemId: "item-1",
      contentId: "content-1",
      title: "쌍계사",
      order: 0,
      reason: "",
      pinned: false,
    },
  ],
  ...overrides,
});

describe("ItineraryResult", () => {
  it("모든 일자를 렌더한다", () => {
    render(
      <ItineraryResult
        data={{
          days: [
            makeDay({ dayIndex: 0 }),
            makeDay({ dayId: "day-2", dayIndex: 1 }),
          ],
        }}
      />,
    );

    expect(screen.getByText("1일차")).toBeInTheDocument();
    expect(screen.getByText("2일차")).toBeInTheDocument();
  });

  it("일자가 없으면 빈 상태 메시지를 표시한다", () => {
    render(<ItineraryResult data={{ days: [] }} />);

    expect(screen.getByText("생성된 일정이 없습니다")).toBeInTheDocument();
  });
});
