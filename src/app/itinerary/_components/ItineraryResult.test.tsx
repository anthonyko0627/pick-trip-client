import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as contentServiceModule from "@/services/contentService";
import type { Day } from "@/types/itinerary";
import { ItineraryResult } from "./ItineraryResult";

vi.mock("@/services/contentService");

const makeDay = (overrides: Partial<Day> = {}): Day => ({
  dayId: "day-1",
  dayIndex: 1,
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
            makeDay({ dayIndex: 1 }),
            makeDay({ dayId: "day-2", dayIndex: 2 }),
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

  it("editor가 없으면 편집 컨트롤과 저장 버튼을 렌더하지 않는다", () => {
    render(<ItineraryResult data={{ days: [makeDay()] }} />);

    expect(
      screen.queryByRole("button", { name: /변경사항 저장/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "위로 이동" }),
    ).not.toBeInTheDocument();
  });

  const makeEditor = (
    overrides: Partial<Parameters<typeof ItineraryResult>[0]["editor"]> = {},
  ) => ({
    region: "HADONG" as const,
    travelDate: "2026-08-01",
    duration: 1,
    days: [makeDay()],
    isDirty: false,
    isSaving: false,
    saveError: null,
    onMoveItem: vi.fn(),
    onRemoveItem: vi.fn(),
    onTogglePinned: vi.fn(),
    onReplaceItem: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  });

  it("editor가 있으면 editor.days를 렌더하고 isDirty=false면 저장 버튼이 비활성화된다", () => {
    render(<ItineraryResult data={{ days: [] }} editor={makeEditor()} />);

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "변경사항 저장" }),
    ).toBeDisabled();
  });

  it("isDirty=true이면 저장 버튼이 활성화되고 클릭 시 onSave를 호출한다", async () => {
    const onSave = vi.fn();
    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({ isDirty: true, onSave })}
      />,
    );

    const saveButton = screen.getByRole("button", { name: "변경사항 저장" });
    expect(saveButton).toBeEnabled();

    await userEvent.click(saveButton);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("saveError가 있으면 에러 메시지를 표시한다", () => {
    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({
          saveError: { message: "저장에 실패했습니다.", traceId: "t-1" },
        })}
      />,
    );

    expect(screen.getByText(/저장에 실패했습니다\./)).toBeInTheDocument();
    expect(screen.getByText(/t-1/)).toBeInTheDocument();
  });

  it("대체 장소 버튼 클릭 시 피커를 열고, 선택하면 onReplaceItem을 호출한다", async () => {
    const mockGetContents = vi.mocked(contentServiceModule.getContents);
    mockGetContents.mockResolvedValue({
      contents: [
        {
          id: "content-3",
          name: "화개장터",
          region: "HADONG",
          imageUrl: null,
          address: "경남 하동군 화개면",
        },
      ],
      total: 1,
    });
    const onReplaceItem = vi.fn();

    render(
      <ItineraryResult
        data={{ days: [] }}
        editor={makeEditor({ onReplaceItem })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "대체 장소" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "이 장소로 교체" }),
    );

    expect(onReplaceItem).toHaveBeenCalledWith(
      "day-1",
      "item-1",
      expect.objectContaining({ id: "content-3" }),
    );
  });
});
