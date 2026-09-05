import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import type { Content } from "@/types/content";
import type { FavoriteResponse } from "@/types/favorite";
import { useFavorites } from "./useFavorites";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/services/favoriteService", () => ({
  getFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  favoriteToContent: vi.fn(),
  contentToAddFavoriteRequest: vi.fn(),
}));

import {
  addFavorite,
  contentToAddFavoriteRequest,
  favoriteToContent,
  getFavorites,
  removeFavorite,
} from "@/services/favoriteService";

const mockGetFavorites = vi.mocked(getFavorites);
const mockAddFavorite = vi.mocked(addFavorite);
const mockRemoveFavorite = vi.mocked(removeFavorite);
const mockFavoriteToContent = vi.mocked(favoriteToContent);
const mockContentToAddFavoriteRequest = vi.mocked(contentToAddFavoriteRequest);

const stub: Content = {
  id: "content-1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

const stubFavorite: FavoriteResponse = {
  id: "fav-1",
  contentId: "content-1",
  title: "쌍계사",
  address: "경남 하동군",
  firstImage: null,
  category: "CULTURE",
  summary: "천년 고찰",
  indoor: false,
  region: "HADONG",
  createdAt: "2026-01-01T00:00:00Z",
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFavoriteToContent.mockImplementation((fav) => ({
      id: fav.contentId,
      name: fav.title,
      region: fav.region,
      category: fav.category ?? undefined,
      imageUrl: fav.firstImage ?? null,
      address: fav.address ?? "",
      summary: fav.summary ?? undefined,
      indoor: fav.indoor ?? undefined,
    }));
    mockContentToAddFavoriteRequest.mockImplementation((content) => ({
      contentId: content.id,
      title: content.name,
      address: content.address,
      firstImage: content.imageUrl ?? undefined,
      category: content.category,
      summary: content.summary,
      indoor: content.indoor,
      region: content.region,
    }));
    mockUseAuth.mockReturnValue({
      status: "authenticated",
      runAuthed: (fn: (token?: string) => unknown) => fn(undefined),
    });
  });

  it("unauthenticated면 조회하지 않고 items는 빈 배열이다", () => {
    mockUseAuth.mockReturnValue({
      status: "unauthenticated",
      runAuthed: (fn: (token?: string) => unknown) => fn(undefined),
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });

    expect(result.current.items).toEqual([]);
    expect(mockGetFavorites).not.toHaveBeenCalled();
  });

  it("authenticated면 찜 목록을 조회해 Content 배열로 변환한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [stubFavorite] });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]).toEqual(stub);
    expect(mockGetFavorites).toHaveBeenCalledWith(undefined);
  });

  it("isFavorited은 items에 있는 id에 true를 반환한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [stubFavorite] });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.isFavorited("content-1")).toBe(true);
    expect(result.current.isFavorited("other")).toBe(false);
  });

  it("add는 낙관적으로 items에 추가하고 서버 응답으로 갱신한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [] });
    mockAddFavorite.mockResolvedValueOnce(stubFavorite);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.add(stub);
    });

    // 낙관적 업데이트: 응답을 기다리지 않고 즉시 반영된다.
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    await waitFor(() => expect(mockAddFavorite).toHaveBeenCalled());
    expect(mockAddFavorite).toHaveBeenCalledWith(
      mockContentToAddFavoriteRequest(stub),
      undefined,
    );
  });

  it("add 실패(FAVORITE_DUPLICATE 아님) 시 낙관적 업데이트를 롤백한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [] });
    mockAddFavorite.mockRejectedValueOnce(
      new ApiError(500, "서버 오류", "INTERNAL_ERROR"),
    );

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.add(stub);
    });

    // 즉시 실패하는 요청이라 낙관적으로 반영된 중간 상태를 안정적으로
    // 관찰하기 어려워, 최종적으로 롤백됐는지만 확인한다.
    await waitFor(() => expect(result.current.items).toHaveLength(0));
    expect(mockAddFavorite).toHaveBeenCalled();
  });

  it("add 실패가 FAVORITE_DUPLICATE면 낙관적 업데이트를 유지한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [] });
    mockAddFavorite.mockRejectedValueOnce(
      new ApiError(409, "이미 찜한 콘텐츠입니다", "FAVORITE_DUPLICATE"),
    );

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.add(stub);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await waitFor(() => expect(mockAddFavorite).toHaveBeenCalled());
    expect(result.current.items).toHaveLength(1);
  });

  it("remove는 낙관적으로 items에서 제거한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [stubFavorite] });
    mockRemoveFavorite.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.remove("content-1");
    });

    await waitFor(() => expect(result.current.items).toHaveLength(0));
    await waitFor(() =>
      expect(mockRemoveFavorite).toHaveBeenCalledWith("content-1", undefined),
    );
  });

  it("remove 실패(FAVORITE_NOT_FOUND 아님) 시 낙관적 업데이트를 롤백한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [stubFavorite] });
    mockRemoveFavorite.mockRejectedValueOnce(
      new ApiError(500, "서버 오류", "INTERNAL_ERROR"),
    );

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.remove("content-1");
    });

    // 즉시 실패하는 요청이라 낙관적으로 반영된 중간 상태를 안정적으로
    // 관찰하기 어려워, 최종적으로 롤백됐는지만 확인한다.
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(mockRemoveFavorite).toHaveBeenCalled();
  });

  it("remove 실패가 FAVORITE_NOT_FOUND면 낙관적 업데이트를 유지한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [stubFavorite] });
    mockRemoveFavorite.mockRejectedValueOnce(
      new ApiError(404, "찜을 찾을 수 없습니다", "FAVORITE_NOT_FOUND"),
    );

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.remove("content-1");
    });

    await waitFor(() => expect(mockRemoveFavorite).toHaveBeenCalled());
    expect(result.current.items).toHaveLength(0);
  });

  it("isAdding/isRemoving은 mutation 진행 상태를 반영한다", async () => {
    mockGetFavorites.mockResolvedValueOnce({ items: [] });
    let resolveAdd: (value: FavoriteResponse) => void = () => {};
    mockAddFavorite.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAdd = resolve;
      }),
    );

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.items).toEqual([]));

    act(() => {
      result.current.add(stub);
    });

    await waitFor(() => expect(result.current.isAdding).toBe(true));

    await act(async () => {
      resolveAdd(stubFavorite);
    });

    await waitFor(() => expect(result.current.isAdding).toBe(false));
  });
});
