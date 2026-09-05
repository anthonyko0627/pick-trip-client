"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { parseApiError } from "@/lib/errors";
import { FAVORITES_QUERY_KEY } from "@/lib/queryKeys";
import {
  addFavorite,
  contentToAddFavoriteRequest,
  favoriteToContent,
  getFavorites,
  removeFavorite,
} from "@/services/favoriteService";
import type { Content } from "@/types/content";

interface AddContext {
  previous: Content[];
}

interface RemoveContext {
  previous: Content[];
}

// 서버 찜 목록(/api/v1/favorites)을 React Query로 캐싱하는 훅. 비로그인
// 상태에서는 조회하지 않고 items를 빈 배열로 둔다. add/remove는 낙관적으로
// 즉시 반영하고, 서버가 이미 같은 상태(중복 찜/찜 없음)라고 응답하면
// 그 낙관적 반영을 성공으로 간주해 롤백하지 않는다.
export function useFavorites() {
  const { status, runAuthed } = useAuth();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: async () => {
      const response = await runAuthed((token) => getFavorites(token));
      return response.items.map(favoriteToContent);
    },
    enabled: status === "authenticated",
    staleTime: Number.POSITIVE_INFINITY,
  });

  const items = favoritesQuery.data ?? [];

  const addMutation = useMutation({
    mutationFn: (content: Content) =>
      runAuthed((token) =>
        addFavorite(contentToAddFavoriteRequest(content), token),
      ),
    onMutate: async (content): Promise<AddContext> => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous =
        queryClient.getQueryData<Content[]>(FAVORITES_QUERY_KEY) ?? [];
      if (!previous.some((c) => c.id === content.id)) {
        queryClient.setQueryData<Content[]>(FAVORITES_QUERY_KEY, [
          ...previous,
          content,
        ]);
      }
      return { previous };
    },
    onSuccess: (response, content) => {
      const current =
        queryClient.getQueryData<Content[]>(FAVORITES_QUERY_KEY) ?? [];
      queryClient.setQueryData<Content[]>(
        FAVORITES_QUERY_KEY,
        current.map((c) =>
          c.id === content.id ? favoriteToContent(response) : c,
        ),
      );
    },
    onError: (err, _content, context) => {
      // 이미 찜한 상태라 서버가 중복으로 거절한 경우, 화면에는 이미 찜한
      // 상태로 보이는 게 맞으므로 낙관적 업데이트를 그대로 둔다.
      if (parseApiError(err).code === "FAVORITE_DUPLICATE") return;
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previous);
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (contentId: string) =>
      runAuthed((token) => removeFavorite(contentId, token)),
    onMutate: async (contentId): Promise<RemoveContext> => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_QUERY_KEY });
      const previous =
        queryClient.getQueryData<Content[]>(FAVORITES_QUERY_KEY) ?? [];
      queryClient.setQueryData<Content[]>(
        FAVORITES_QUERY_KEY,
        previous.filter((c) => c.id !== contentId),
      );
      return { previous };
    },
    onError: (err, _contentId, context) => {
      // 이미 찜이 없는 상태라 서버가 404로 응답한 경우도 마찬가지로 낙관적
      // 업데이트(제거됨)를 유지한다.
      if (parseApiError(err).code === "FAVORITE_NOT_FOUND") return;
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previous);
      }
    },
  });

  return {
    items,
    add: (content: Content) => addMutation.mutate(content),
    remove: (contentId: string) => removeMutation.mutate(contentId),
    // items 배열을 직접 구독한 값으로 계산해야 한다 — isFavorited(id) 같은
    // 캐시된 함수 참조를 그대로 노출하면 React Compiler가 순수 함수로
    // 오인해 상태 변경 시 재계산을 건너뛴다(useFavoriteHeart 참고).
    isFavorited: (contentId: string) => items.some((c) => c.id === contentId),
    isLoading: favoritesQuery.isPending && status === "authenticated",
    isError: favoritesQuery.isError,
    refetch: favoritesQuery.refetch,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
