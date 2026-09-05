import { apiClient } from "@/services/apiClient";
import type { Content } from "@/types/content";
import type {
  AddFavoriteRequest,
  FavoriteResponse,
  FavoritesResponse,
} from "@/types/favorite";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export async function getFavorites(
  accessToken?: string,
): Promise<FavoritesResponse> {
  const { data } = await apiClient.get<FavoritesResponse>("/api/v1/favorites", {
    headers: authHeaders(accessToken),
  });
  return data;
}

export async function addFavorite(
  request: AddFavoriteRequest,
  accessToken?: string,
): Promise<FavoriteResponse> {
  const { data } = await apiClient.post<FavoriteResponse>(
    "/api/v1/favorites",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
}

export async function removeFavorite(
  contentId: string,
  accessToken?: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/favorites/${contentId}`, {
    headers: authHeaders(accessToken),
  });
}

export function favoriteToContent(favorite: FavoriteResponse): Content {
  return {
    id: favorite.contentId,
    name: favorite.title,
    region: favorite.region,
    category: favorite.category ?? undefined,
    imageUrl: favorite.firstImage ?? null,
    address: favorite.address ?? "",
    summary: favorite.summary ?? undefined,
    indoor: favorite.indoor ?? undefined,
  };
}

export function contentToAddFavoriteRequest(
  content: Content,
): AddFavoriteRequest {
  return {
    contentId: content.id,
    title: content.name,
    address: content.address,
    firstImage: content.imageUrl ?? undefined,
    category: content.category,
    summary: content.summary,
    indoor: content.indoor,
    region: content.region,
  };
}
