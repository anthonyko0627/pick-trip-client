"use client";

interface BasketFabProps {
  count: number;
  onOpen: () => void;
}

export function BasketFab({ count, onOpen }: BasketFabProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 lg:hidden"
      aria-label="여행 바구니 열기"
    >
      🧺 바구니 {count}개
    </button>
  );
}
