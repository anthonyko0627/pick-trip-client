import type { ContentCategory } from "@/types/content";
import type { Region } from "@/types/region";

// ── 서버 찜 API 계약 (/api/v1/favorites) ──────────────────────────
export interface FavoriteResponse {
  id: string;
  contentId: string;
  title: string;
  address: string | null;
  firstImage: string | null;
  category: ContentCategory | null;
  summary: string | null;
  indoor: boolean | null;
  region: Region;
  createdAt: string;
}

export interface FavoritesResponse {
  items: FavoriteResponse[];
}

export interface AddFavoriteRequest {
  contentId: string;
  title: string;
  address?: string;
  firstImage?: string;
  category?: ContentCategory;
  summary?: string;
  indoor?: boolean;
  region: Region;
}
