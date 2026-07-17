import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useSavedItinerariesStore } from "@/stores/savedItinerariesStore";
import type { SavedItinerarySummary } from "@/types/itinerary";

import { useSavedItineraries } from "./useSavedItineraries";

const summary1: SavedItinerarySummary = {
  itineraryId: "itinerary-1",
  title: "하동 1박 2일 여행",
  region: "HADONG",
  travelDate: "2026-08-01",
  duration: 1,
  savedAt: 1000,
};

const summary2: SavedItinerarySummary = {
  itineraryId: "itinerary-2",
  title: "영주 당일치기",
  region: "YEONGJU",
  travelDate: "2026-09-01",
  duration: 0,
  savedAt: 2000,
};

describe("useSavedItineraries", () => {
  beforeEach(() => {
    localStorage.clear();
    // 전역 스토어는 테스트 간 상태가 누수되므로 초기 상태로 리셋한다.
    useSavedItinerariesStore.setState({ items: [], hydrated: false });
  });

  it("초기 상태는 빈 배열이다", () => {
    const { result } = renderHook(() => useSavedItineraries());
    expect(result.current.items).toEqual([]);
  });

  it("add로 항목을 추가하면 items에 포함된다", () => {
    const { result } = renderHook(() => useSavedItineraries());
    act(() => {
      result.current.add(summary1);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].itineraryId).toBe("itinerary-1");
  });

  it("같은 itineraryId를 다시 add하면 최신 정보로 교체되고 중복되지 않는다", () => {
    const { result } = renderHook(() => useSavedItineraries());
    act(() => {
      result.current.add(summary1);
      result.current.add({ ...summary1, title: "하동 1박 2일 여행(수정됨)" });
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe("하동 1박 2일 여행(수정됨)");
  });

  it("items는 savedAt 내림차순으로 정렬된다", () => {
    const { result } = renderHook(() => useSavedItineraries());
    act(() => {
      result.current.add(summary1);
      result.current.add(summary2);
    });
    expect(result.current.items.map((i) => i.itineraryId)).toEqual([
      "itinerary-2",
      "itinerary-1",
    ]);
  });

  it("remove로 항목을 제거하면 items에서 사라진다", () => {
    const { result } = renderHook(() => useSavedItineraries());
    act(() => {
      result.current.add(summary1);
      result.current.remove("itinerary-1");
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("추가한 항목이 localStorage에 저장된다", () => {
    const { result } = renderHook(() => useSavedItineraries());
    act(() => {
      result.current.add(summary1);
    });
    const stored = JSON.parse(
      localStorage.getItem("pick-trip-saved-itineraries") ?? "[]",
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].itineraryId).toBe("itinerary-1");
  });

  it("localStorage에 저장된 값을 초기 마운트 시 불러온다", () => {
    localStorage.setItem(
      "pick-trip-saved-itineraries",
      JSON.stringify([summary1]),
    );
    const { result } = renderHook(() => useSavedItineraries());
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].itineraryId).toBe("itinerary-1");
  });
});
