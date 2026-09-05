import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import type { Content } from "@/types/content";
import type { AddFavoriteRequest, FavoriteResponse } from "@/types/favorite";
import { apiClient } from "./apiClient";
import {
  addFavorite,
  contentToAddFavoriteRequest,
  favoriteToContent,
  getFavorites,
  removeFavorite,
} from "./favoriteService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

describe("getFavorites", () => {
  const mockResponse = {
    items: [
      {
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
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/favorites를 호출하고 응답을 그대로 반환한다", async () => {
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getFavorites();

    expect(mockGet).toHaveBeenCalledWith("/api/v1/favorites", {
      headers: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    await getFavorites("access-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/favorites", {
      headers: { Authorization: "Bearer access-1" },
    });
  });
});

describe("addFavorite", () => {
  const mockRequest: AddFavoriteRequest = {
    contentId: "content-1",
    title: "쌍계사",
    address: "경남 하동군",
    region: "HADONG",
  };

  const mockResponse: FavoriteResponse = {
    id: "fav-1",
    contentId: "content-1",
    title: "쌍계사",
    address: "경남 하동군",
    firstImage: null,
    category: null,
    summary: null,
    indoor: null,
    region: "HADONG",
    createdAt: "2026-01-01T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/v1/favorites를 올바른 body로 호출하고 응답을 그대로 반환한다", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await addFavorite(mockRequest);

    expect(mockPost).toHaveBeenCalledWith("/api/v1/favorites", mockRequest, {
      headers: undefined,
    });
    expect(result).toEqual(mockResponse);
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    await addFavorite(mockRequest, "access-1");

    expect(mockPost).toHaveBeenCalledWith("/api/v1/favorites", mockRequest, {
      headers: { Authorization: "Bearer access-1" },
    });
  });

  it("오류 전파: apiClient가 throw 하면 오류를 그대로 전파한다", async () => {
    const testError = new ApiError(
      409,
      "이미 찜한 콘텐츠입니다.",
      "FAVORITE_DUPLICATE",
    );
    mockPost.mockRejectedValueOnce(testError);

    await expect(addFavorite(mockRequest)).rejects.toThrow(testError);
  });
});

describe("removeFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DELETE /api/v1/favorites/{contentId}를 호출한다", async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await removeFavorite("content-1");

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/favorites/content-1", {
      headers: undefined,
    });
  });

  it("accessToken을 전달하면 Authorization 헤더를 붙인다", async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await removeFavorite("content-1", "access-1");

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/favorites/content-1", {
      headers: { Authorization: "Bearer access-1" },
    });
  });
});

describe("favoriteToContent", () => {
  it("FavoriteResponse를 Content로 변환한다", () => {
    const favorite: FavoriteResponse = {
      id: "fav-1",
      contentId: "content-1",
      title: "쌍계사",
      address: "경남 하동군",
      firstImage: "https://example.com/1.jpg",
      category: "CULTURE",
      summary: "천년 고찰",
      indoor: false,
      region: "HADONG",
      createdAt: "2026-01-01T00:00:00Z",
    };

    expect(favoriteToContent(favorite)).toEqual<Content>({
      id: "content-1",
      name: "쌍계사",
      region: "HADONG",
      category: "CULTURE",
      imageUrl: "https://example.com/1.jpg",
      address: "경남 하동군",
      summary: "천년 고찰",
      indoor: false,
    });
  });

  it("null 필드는 undefined/기본값으로 변환한다", () => {
    const favorite: FavoriteResponse = {
      id: "fav-1",
      contentId: "content-1",
      title: "쌍계사",
      address: null,
      firstImage: null,
      category: null,
      summary: null,
      indoor: null,
      region: "HADONG",
      createdAt: "2026-01-01T00:00:00Z",
    };

    expect(favoriteToContent(favorite)).toEqual<Content>({
      id: "content-1",
      name: "쌍계사",
      region: "HADONG",
      category: undefined,
      imageUrl: null,
      address: "",
      summary: undefined,
      indoor: undefined,
    });
  });
});

describe("contentToAddFavoriteRequest", () => {
  it("Content를 AddFavoriteRequest로 변환한다", () => {
    const content: Content = {
      id: "content-1",
      name: "쌍계사",
      region: "HADONG",
      category: "CULTURE",
      imageUrl: "https://example.com/1.jpg",
      address: "경남 하동군",
      summary: "천년 고찰",
      indoor: false,
    };

    expect(contentToAddFavoriteRequest(content)).toEqual<AddFavoriteRequest>({
      contentId: "content-1",
      title: "쌍계사",
      address: "경남 하동군",
      firstImage: "https://example.com/1.jpg",
      category: "CULTURE",
      summary: "천년 고찰",
      indoor: false,
      region: "HADONG",
    });
  });

  it("imageUrl이 null이면 firstImage를 undefined로 변환한다", () => {
    const content: Content = {
      id: "content-1",
      name: "쌍계사",
      region: "HADONG",
      imageUrl: null,
      address: "경남 하동군",
    };

    expect(contentToAddFavoriteRequest(content).firstImage).toBeUndefined();
  });
});
