import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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

  it("편집 콜백이 없으면 컨트롤 버튼을 렌더하지 않는다", () => {
    render(<PlaceItem item={makeItem()} />);

    expect(
      screen.queryByRole("button", { name: "위로 이동" }),
    ).not.toBeInTheDocument();
  });

  it("pinned=true이면 고정 뱃지를 표시한다", () => {
    render(<PlaceItem item={makeItem({ pinned: true })} />);

    expect(screen.getByText("고정")).toBeInTheDocument();
  });

  it("startTime·endTime이 둘 다 있으면 머무는 시간을 표시한다", () => {
    render(
      <PlaceItem item={makeItem({ startTime: "09:30", endTime: "11:00" })} />,
    );

    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText("11:00")).toBeInTheDocument();
    expect(screen.getByText("머무는 시간 1시간 30분")).toBeInTheDocument();
  });

  it("방문 시각이 한쪽만 있으면 머무는 시간을 표시하지 않는다", () => {
    const { rerender } = render(
      <PlaceItem item={makeItem({ startTime: "09:30", endTime: null })} />,
    );
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.queryByText(/머무는 시간/)).not.toBeInTheDocument();

    rerender(<PlaceItem item={makeItem({ startTime: null, endTime: null })} />);
    expect(screen.queryByText(/머무는 시간/)).not.toBeInTheDocument();
  });

  it("v3: inclinePenaltyMinutes가 0보다 크면 오르막 캡션을 표시한다", () => {
    render(
      <PlaceItem
        item={makeItem({
          elevationGainMeters: 120.5,
          inclinePenaltyMinutes: 12,
        })}
      />,
    );

    expect(
      screen.getByText("오르막 반영 +12분 · 상승 121m"),
    ).toBeInTheDocument();
  });

  it("v3: inclinePenaltyMinutes가 0이거나 없으면 오르막 캡션을 표시하지 않는다", () => {
    const { rerender } = render(
      <PlaceItem
        item={makeItem({ elevationGainMeters: 0, inclinePenaltyMinutes: 0 })}
      />,
    );
    expect(screen.queryByText(/오르막 반영/)).not.toBeInTheDocument();

    rerender(<PlaceItem item={makeItem()} />);
    expect(screen.queryByText(/오르막 반영/)).not.toBeInTheDocument();
  });

  it("방문 시각이 없어도 시각 열 placeholder를 유지한다", () => {
    render(<PlaceItem item={makeItem({ startTime: null, endTime: null })} />);

    // 시각이 없을 때도 타임라인 정렬을 위해 · placeholder를 둔다.
    expect(screen.getByText("·")).toBeInTheDocument();
  });

  it("notes가 있으면 경고 문구를 모두 렌더한다", () => {
    render(
      <PlaceItem
        item={makeItem({
          notes: [
            "개장 전 도착이라 09:30까지 대기가 필요합니다.",
            "방문 예정일이 휴무일입니다.",
          ],
        })}
      />,
    );

    expect(
      screen.getByText("개장 전 도착이라 09:30까지 대기가 필요합니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("방문 예정일이 휴무일입니다.")).toBeInTheDocument();
  });

  it("notes가 없으면 경고 목록을 렌더하지 않는다", () => {
    render(<PlaceItem item={makeItem({ notes: [] })} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("isFirst=true이면 위로 이동 버튼이 비활성화된다", () => {
    render(
      <PlaceItem
        item={makeItem()}
        isFirst
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "위로 이동" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "아래로 이동" })).toBeEnabled();
  });

  it("isLast=true이면 아래로 이동 버튼이 비활성화된다", () => {
    render(
      <PlaceItem
        item={makeItem()}
        isLast
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "아래로 이동" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "위로 이동" })).toBeEnabled();
  });

  it("위/아래 이동 버튼 클릭 시 각 콜백을 호출한다", async () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(
      <PlaceItem
        item={makeItem()}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "위로 이동" }));
    await userEvent.click(screen.getByRole("button", { name: "아래로 이동" }));

    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it("고정 버튼 클릭 시 onTogglePinned를 호출한다", async () => {
    const onTogglePinned = vi.fn();
    render(<PlaceItem item={makeItem()} onTogglePinned={onTogglePinned} />);

    await userEvent.click(screen.getByRole("button", { name: /고정/ }));

    expect(onTogglePinned).toHaveBeenCalledTimes(1);
  });

  it("대체 장소 버튼 클릭 시 onOpenReplacePicker를 호출한다", async () => {
    const onOpenReplacePicker = vi.fn();
    render(
      <PlaceItem item={makeItem()} onOpenReplacePicker={onOpenReplacePicker} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "대체 장소" }));

    expect(onOpenReplacePicker).toHaveBeenCalledTimes(1);
  });

  it("삭제 버튼은 두 번 클릭해야 onRemove를 호출한다", async () => {
    const onRemove = vi.fn();
    render(<PlaceItem item={makeItem()} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onRemove).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "정말 삭제?" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "정말 삭제?" }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("addedByAi=true이면 AI 추천 배지를 표시한다", () => {
    render(<PlaceItem item={makeItem({ addedByAi: true })} />);

    expect(screen.getByText("AI 추천")).toBeInTheDocument();
  });

  it("onDismissAiSuggestion이 없으면 AI 추천 배지는 버튼이 아니다", () => {
    render(<PlaceItem item={makeItem({ addedByAi: true })} />);

    expect(
      screen.queryByRole("button", { name: "AI 추천 삭제" }),
    ).not.toBeInTheDocument();
  });

  it("AI 추천 배지 클릭 시 onDismissAiSuggestion을 바로 호출한다(확인 단계 없음)", async () => {
    const onDismissAiSuggestion = vi.fn();
    render(
      <PlaceItem
        item={makeItem({ addedByAi: true })}
        onDismissAiSuggestion={onDismissAiSuggestion}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "AI 추천 삭제" }));

    expect(onDismissAiSuggestion).toHaveBeenCalledTimes(1);
  });

  it("addedForRest=true이면 휴식 배지와 reason(삽입 사유)을 표시한다", () => {
    render(
      <PlaceItem
        item={makeItem({
          addedForRest: true,
          reason: "누적 도보 시간이 90분을 넘어 휴식을 추가했어요",
        })}
      />,
    );

    expect(screen.getByText("휴식")).toBeInTheDocument();
    expect(
      screen.getByText("누적 도보 시간이 90분을 넘어 휴식을 추가했어요"),
    ).toBeInTheDocument();
  });

  it("addedByAi와 addedForRest가 둘 다 없으면 두 배지 모두 렌더하지 않는다", () => {
    render(<PlaceItem item={makeItem()} />);

    expect(screen.queryByText("AI 추천")).not.toBeInTheDocument();
    expect(screen.queryByText("휴식")).not.toBeInTheDocument();
  });

  it("isStartPoint=true이면 출발 배지를 표시한다", () => {
    render(<PlaceItem item={makeItem()} isStartPoint />);

    expect(screen.getByText("출발")).toBeInTheDocument();
  });

  it("isStartPoint가 없으면 출발 배지를 렌더하지 않는다", () => {
    render(<PlaceItem item={makeItem()} />);

    expect(screen.queryByText("출발")).not.toBeInTheDocument();
  });
});
