import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Content } from "@/types/content";
import { useFavoriteHeart } from "./useFavoriteHeart";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/explore",
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseFavorites = vi.fn();
vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => mockUseFavorites(),
}));

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

describe("useFavoriteHeart", () => {
  const add = vi.fn();
  const remove = vi.fn();

  beforeEach(() => {
    mockPush.mockClear();
    add.mockClear();
    remove.mockClear();
    mockUseAuth.mockReturnValue({ status: "authenticated" });
    mockUseFavorites.mockReturnValue({
      items: [],
      add,
      remove,
      isAdding: false,
      isRemoving: false,
    });
  });

  it("찜하지 않은 상태면 active는 false다", () => {
    const { result } = renderHook(() => useFavoriteHeart(stub));
    expect(result.current.active).toBe(false);
  });

  it("찜한 상태면 active는 true다", () => {
    mockUseFavorites.mockReturnValue({
      items: [stub],
      add,
      remove,
      isAdding: false,
      isRemoving: false,
    });

    const { result } = renderHook(() => useFavoriteHeart(stub));
    expect(result.current.active).toBe(true);
  });

  it("찜하지 않은 상태에서 toggle하면 add를 호출한다", () => {
    const { result } = renderHook(() => useFavoriteHeart(stub));
    result.current.toggle();
    expect(add).toHaveBeenCalledWith(stub);
    expect(remove).not.toHaveBeenCalled();
  });

  it("찜한 상태에서 toggle하면 remove를 호출한다", () => {
    mockUseFavorites.mockReturnValue({
      items: [stub],
      add,
      remove,
      isAdding: false,
      isRemoving: false,
    });

    const { result } = renderHook(() => useFavoriteHeart(stub));
    result.current.toggle();
    expect(remove).toHaveBeenCalledWith(stub.id);
    expect(add).not.toHaveBeenCalled();
  });

  it("비로그인 상태에서 toggle하면 로그인으로 유도하고 add/remove를 호출하지 않는다", () => {
    mockUseAuth.mockReturnValue({ status: "unauthenticated" });

    const { result } = renderHook(() => useFavoriteHeart(stub));
    result.current.toggle();

    expect(mockPush).toHaveBeenCalledWith("/login?next=%2Fexplore");
    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("isAdding/isRemoving이 모두 false면 pending은 false다", () => {
    const { result } = renderHook(() => useFavoriteHeart(stub));
    expect(result.current.pending).toBe(false);
  });

  it("isAdding이 true면 pending은 true다", () => {
    mockUseFavorites.mockReturnValue({
      items: [],
      add,
      remove,
      isAdding: true,
      isRemoving: false,
    });

    const { result } = renderHook(() => useFavoriteHeart(stub));
    expect(result.current.pending).toBe(true);
  });

  it("isRemoving이 true면 pending은 true다", () => {
    mockUseFavorites.mockReturnValue({
      items: [stub],
      add,
      remove,
      isAdding: false,
      isRemoving: true,
    });

    const { result } = renderHook(() => useFavoriteHeart(stub));
    expect(result.current.pending).toBe(true);
  });

  it("pending이면 toggle을 호출해도 add/remove를 호출하지 않는다", () => {
    mockUseFavorites.mockReturnValue({
      items: [],
      add,
      remove,
      isAdding: true,
      isRemoving: false,
    });

    const { result } = renderHook(() => useFavoriteHeart(stub));
    result.current.toggle();

    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
