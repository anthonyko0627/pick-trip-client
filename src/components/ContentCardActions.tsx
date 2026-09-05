"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useBasket } from "@/hooks/useBasket";
import { useFavoriteHeart } from "@/hooks/useFavoriteHeart";
import type { Content } from "@/types/content";

interface ContentCardActionsProps {
  content: Content;
}

// 콘텐츠 카드 하단의 찜/담기 액션 행. RecommendedCard, ForYouCard 등 여러 카드가 공유한다.
export function ContentCardActions({ content }: ContentCardActionsProps) {
  const { items: basketItems, add, remove } = useBasket();
  const {
    active: favorited,
    toggle: toggleFavorite,
    pending: favoritePending,
  } = useFavoriteHeart(content);

  // isInBasket(id) 같은 스토어 함수를 렌더 중 직접 호출하면 React Compiler가
  // 이를 순수 함수로 오인해 메모이제이션한다(함수 참조와 content.id가 그대로라 재계산을 건너뜀).
  // items 배열을 직접 구독해 파생값을 계산해야 상태 변경 시 재렌더/재계산이 보장된다.
  const inBasket = basketItems.some((item) => item.content.id === content.id);

  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        aria-label={favorited ? "찜 해제" : "찜하기"}
        aria-pressed={favorited}
        onClick={toggleFavorite}
        disabled={favoritePending}
        className={favorited ? "text-destructive" : "text-muted-foreground"}
      >
        <Icon name="heart" size={18} />
      </button>

      <Button
        size="sm"
        className={
          inBasket
            ? undefined
            : "border-transparent bg-accent text-accent-foreground hover:bg-accent/80"
        }
        onClick={() => (inBasket ? remove(content.id) : add(content))}
      >
        <Icon name={inBasket ? "check" : "plus"} size={14} />
        {inBasket ? "담김" : "담기"}
      </Button>
    </div>
  );
}
