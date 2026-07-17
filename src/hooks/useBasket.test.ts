import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { Content } from "@/types/content";

import { useBasket } from "./useBasket";

const stub: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

const stub2: Content = {
  id: "2",
  name: "화개장터",
  region: "HADONG",
  category: "ATTRACTION",
  imageUrl: null,
  address: "경남 하동군 화개면",
  summary: "전통 시장",
  indoor: false,
};

describe("useBasket", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("초기 상태는 빈 배열이다", () => {
    const { result } = renderHook(() => useBasket());
    expect(result.current.items).toEqual([]);
  });

  it("콘텐츠를 추가하면 items에 포함된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].content.id).toBe("1");
  });

  it("같은 콘텐츠를 두 번 추가해도 1개만 유지된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.add(stub);
    });
    expect(result.current.items).toHaveLength(1);
  });

  it("콘텐츠를 제거하면 items에서 사라진다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.remove("1");
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("isInBasket이 담긴 id에 true를 반환한다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
    });
    expect(result.current.isInBasket("1")).toBe(true);
  });

  it("isInBasket이 담기지 않은 id에 false를 반환한다", () => {
    const { result } = renderHook(() => useBasket());
    expect(result.current.isInBasket("999")).toBe(false);
  });

  it("여러 콘텐츠를 추가할 수 있다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.add(stub2);
    });
    expect(result.current.items).toHaveLength(2);
  });

  it("추가한 항목이 localStorage에 저장된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
    });
    const stored = JSON.parse(localStorage.getItem("pick-trip-basket") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].content.id).toBe("1");
  });

  it("추가된 항목의 초기 우선순위는 null이다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
    });
    expect(result.current.items[0].priority).toBeNull();
  });

  it("setPriority로 항목의 우선순위를 변경한다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.setPriority("1", "MUST");
    });
    expect(result.current.items[0].priority).toBe("MUST");
  });

  it("setPriority에 null을 전달하면 우선순위가 해제된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.setPriority("1", "MUST");
      result.current.setPriority("1", null);
    });
    expect(result.current.items[0].priority).toBeNull();
  });

  it("setPriority 변경이 localStorage에 반영된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.setPriority("1", "SHOULD");
    });
    const stored = JSON.parse(localStorage.getItem("pick-trip-basket") ?? "[]");
    expect(stored[0].priority).toBe("SHOULD");
  });

  it("clear 호출 시 items가 빈 배열이 된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.add(stub2);
      result.current.clear();
    });
    expect(result.current.items).toHaveLength(0);
  });

  it("clear 호출 시 localStorage에서 데이터가 삭제된다", () => {
    const { result } = renderHook(() => useBasket());
    act(() => {
      result.current.add(stub);
      result.current.clear();
    });
    expect(localStorage.getItem("pick-trip-basket")).toBeNull();
  });
});
