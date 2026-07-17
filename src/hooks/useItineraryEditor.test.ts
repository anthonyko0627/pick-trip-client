import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/errors";
import * as itineraryServiceModule from "@/services/itineraryService";
import type { Content } from "@/types/content";
import type { Day, ItineraryResponse } from "@/types/itinerary";

import { useItineraryEditor } from "./useItineraryEditor";

vi.mock("@/services/itineraryService");

const replacementContent: Content = {
  id: "content-3",
  name: "화개장터",
  region: "HADONG",
  imageUrl: null,
  address: "경남 하동군 화개면",
};

function makeDays(): Day[] {
  return [
    {
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
        {
          itemId: "item-2",
          contentId: "content-2",
          title: "칠불사",
          order: 1,
          reason: "인근 명소",
          pinned: false,
        },
      ],
    },
  ];
}

function setup() {
  return renderHook(() =>
    useItineraryEditor({
      itineraryId: "itinerary-1",
      title: "하동 1박 2일 여행",
      region: "HADONG",
      travelDate: "2026-08-01",
      duration: 1,
      initialDays: makeDays(),
    }),
  );
}

describe("useItineraryEditor", () => {
  const mockModifyItinerary = vi.mocked(itineraryServiceModule.modifyItinerary);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("초기 상태는 isDirty가 false이고 initialDays를 그대로 가진다", () => {
    const { result } = setup();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.days).toEqual(makeDays());
  });

  it("moveItem('down')으로 항목 순서를 아래로 바꾸고 order를 재계산한다", () => {
    const { result } = setup();
    act(() => {
      result.current.moveItem("day-1", "item-1", "down");
    });
    expect(result.current.days[0].items.map((i) => i.itemId)).toEqual([
      "item-2",
      "item-1",
    ]);
    expect(result.current.days[0].items.map((i) => i.order)).toEqual([0, 1]);
    expect(result.current.isDirty).toBe(true);
  });

  it("첫 항목을 위로 이동하려 하면 아무 변화가 없다 (경계)", () => {
    const { result } = setup();
    act(() => {
      result.current.moveItem("day-1", "item-1", "up");
    });
    expect(result.current.days[0].items.map((i) => i.itemId)).toEqual([
      "item-1",
      "item-2",
    ]);
  });

  it("마지막 항목을 아래로 이동하려 하면 아무 변화가 없다 (경계)", () => {
    const { result } = setup();
    act(() => {
      result.current.moveItem("day-1", "item-2", "down");
    });
    expect(result.current.days[0].items.map((i) => i.itemId)).toEqual([
      "item-1",
      "item-2",
    ]);
  });

  it("removeItem으로 항목을 삭제하고 나머지 order를 재계산한다", () => {
    const { result } = setup();
    act(() => {
      result.current.removeItem("day-1", "item-1");
    });
    expect(result.current.days[0].items).toHaveLength(1);
    expect(result.current.days[0].items[0]).toMatchObject({
      itemId: "item-2",
      order: 0,
    });
    expect(result.current.isDirty).toBe(true);
  });

  it("togglePinned으로 고정 상태를 토글한다", () => {
    const { result } = setup();
    act(() => {
      result.current.togglePinned("day-1", "item-1");
    });
    expect(result.current.days[0].items[0].pinned).toBe(true);

    act(() => {
      result.current.togglePinned("day-1", "item-1");
    });
    expect(result.current.days[0].items[0].pinned).toBe(false);
  });

  it("replaceItem으로 contentId/title을 교체하고 reason을 비운다", () => {
    const { result } = setup();
    act(() => {
      result.current.replaceItem("day-1", "item-1", replacementContent);
    });
    expect(result.current.days[0].items[0]).toMatchObject({
      contentId: "content-3",
      title: "화개장터",
      reason: "",
    });
    expect(result.current.isDirty).toBe(true);
  });

  it("save 성공 시 올바른 SaveItineraryRequest로 modifyItinerary를 호출하고 dirty를 해제한다", async () => {
    const savedResponse: ItineraryResponse = {
      itineraryId: "itinerary-1",
      title: "하동 1박 2일 여행",
      region: "HADONG",
      travelDate: "2026-08-01",
      duration: 1,
      lastModifiedAt: "2026-08-02T00:00:00Z",
      days: makeDays(),
    };
    mockModifyItinerary.mockResolvedValue(savedResponse);

    const { result } = setup();
    act(() => {
      result.current.togglePinned("day-1", "item-1");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(mockModifyItinerary).toHaveBeenCalledWith(
      "itinerary-1",
      expect.objectContaining({
        title: "하동 1박 2일 여행",
        region: "HADONG",
        travelDate: "2026-08-01",
        duration: 1,
        days: [
          expect.objectContaining({
            dayIndex: 0,
            items: [
              expect.objectContaining({ contentId: "content-1", pinned: true }),
              expect.objectContaining({ contentId: "content-2" }),
            ],
          }),
        ],
      }),
    );

    await waitFor(() => {
      expect(result.current.isDirty).toBe(false);
    });
    expect(result.current.saveError).toBeNull();
  });

  it("save 실패 시 에러를 노출하고 로컬 편집 내용을 유지한다", async () => {
    mockModifyItinerary.mockRejectedValue(
      new ApiError(500, "저장에 실패했습니다.", "INTERNAL_ERROR"),
    );

    const { result } = setup();
    act(() => {
      result.current.removeItem("day-1", "item-2");
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveError?.message).toBe("저장에 실패했습니다.");
    expect(result.current.days[0].items).toHaveLength(1);
    expect(result.current.isDirty).toBe(true);
  });
});
