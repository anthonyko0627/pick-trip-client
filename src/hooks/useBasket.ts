"use client";

import { useEffect, useState } from "react";

import type { BasketItem, BasketPriority } from "@/types/basket";
import type { Content } from "@/types/content";

const STORAGE_KEY = "pick-trip-basket";

export function useBasket() {
  const [items, setItems] = useState<BasketItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: BasketItem[] = JSON.parse(stored);
        setItems(parsed.map((i) => ({ ...i, priority: i.priority ?? null })));
      }
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  const save = (next: BasketItem[]) => {
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const add = (content: Content) => {
    setItems((prev) => {
      if (prev.some((i) => i.content.id === content.id)) return prev;
      const next = [...prev, { content, addedAt: Date.now(), priority: null }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setPriority = (contentId: string, priority: BasketPriority | null) => {
    setItems((prev) => {
      const next = prev.map((i) =>
        i.content.id === contentId ? { ...i, priority } : i,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const remove = (contentId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.content.id !== contentId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isInBasket = (contentId: string) =>
    items.some((i) => i.content.id === contentId);

  const clear = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { items, add, remove, isInBasket, setPriority, clear, save };
}
