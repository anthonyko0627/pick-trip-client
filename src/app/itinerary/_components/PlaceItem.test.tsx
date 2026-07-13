import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Item } from "@/types/itinerary";
import { PlaceItem } from "./PlaceItem";

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  itemId: "item-1",
  contentId: "content-1",
  title: "쌍계사",
  order: 0,
  reason: "지역 대표 명소",
  pinned: false,
  ...overrides,
});

describe("PlaceItem", () => {
  it("장소 이름과 배치 이유를 표시한다", () => {
    render(
      <PlaceItem item={makeItem({ title: "쌍계사", reason: "천년 고찰" })} />,
    );

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("천년 고찰")).toBeInTheDocument();
  });

  it("reason이 빈 문자열이면 이유 텍스트를 렌더하지 않는다", () => {
    render(<PlaceItem item={makeItem({ reason: "" })} />);

    expect(screen.queryByText("천년 고찰")).not.toBeInTheDocument();
  });
});
