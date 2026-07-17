import { create } from "zustand";

import type { BasketItem, BasketPriority } from "@/types/basket";
import type { Content } from "@/types/content";

const STORAGE_KEY = "pick-trip-basket";

interface BasketState {
  items: BasketItem[];
  // 초기 렌더는 빈 배열이고, 마운트 시 localStorage에서 1회 로드한다.
  hydrated: boolean;
  hydrate: () => void;
  add: (content: Content) => void;
  remove: (contentId: string) => void;
  setPriority: (contentId: string, priority: BasketPriority | null) => void;
  isInBasket: (contentId: string) => boolean;
  clear: () => void;
  // 외부에서 계산한 다음 배열로 통째로 교체한다.
  save: (next: BasketItem[]) => void;
}

// raw 배열 JSON 형태 그대로 저장한다(persist 래퍼를 쓰지 않는다).
function persist(items: BasketItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useBasketStore = create<BasketState>((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: BasketItem[] = JSON.parse(stored);
        // priority가 없는 손상/구버전 데이터는 null로 보정한다.
        set({
          items: parsed.map((i) => ({ ...i, priority: i.priority ?? null })),
        });
      }
    } catch {
      // 손상된 데이터는 무시
    }
    set({ hydrated: true });
  },

  add: (content) => {
    const prev = get().items;
    if (prev.some((i) => i.content.id === content.id)) return;
    const next = [...prev, { content, addedAt: Date.now(), priority: null }];
    persist(next);
    set({ items: next });
  },

  setPriority: (contentId, priority) => {
    const next = get().items.map((i) =>
      i.content.id === contentId ? { ...i, priority } : i,
    );
    persist(next);
    set({ items: next });
  },

  remove: (contentId) => {
    const next = get().items.filter((i) => i.content.id !== contentId);
    persist(next);
    set({ items: next });
  },

  isInBasket: (contentId) =>
    get().items.some((i) => i.content.id === contentId),

  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ items: [] });
  },

  save: (next) => {
    persist(next);
    set({ items: next });
  },
}));
