"use client";

import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import type { Content } from "@/types/content";

// 콘텐츠 카드/상세의 찜 하트 상태와 토글 동작을 한곳에 모은 얇은 훅.
// 비로그인 상태에서는 로컬 찜 데이터를 무시하고 하트를 항상 비활성으로 두며,
// 클릭하면 로그인으로 유도한다.
export function useFavoriteHeart(content: Content) {
  const { status } = useAuth();
  const { items, add, remove, isAdding, isRemoving } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();

  const authed = status === "authenticated";
  // isFavorited(id) 같은 store 함수를 렌더 중 직접 호출하면 React Compiler가
  // 순수 함수로 오인해 상태 변경 시 재계산을 건너뛴다. items 배열을 직접
  // 구독한 값으로 계산해야 한다(ContentCardActions의 기존 주석 참고).
  const active = authed && items.some((c) => c.id === content.id);
  // 찜 추가/제거 요청이 아직 끝나지 않은 동안 중복 클릭으로 요청이 겹치지
  // 않도록 소비처(버튼)가 disabled 처리에 쓸 수 있게 노출한다.
  const pending = isAdding || isRemoving;

  function toggle() {
    if (!authed) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (pending) return;
    if (active) {
      remove(content.id);
    } else {
      add(content);
    }
  }

  return { active, toggle, pending };
}
