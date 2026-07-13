"use client";

import { useEffect, useState } from "react";

import type { SavedItinerarySummary } from "@/types/itinerary";

const STORAGE_KEY = "pick-trip-saved-itineraries";

function sortByRecent(items: SavedItinerarySummary[]) {
  return [...items].sort((a, b) => b.savedAt - a.savedAt);
}

export function useSavedItineraries() {
  const [items, setItems] = useState<SavedItinerarySummary[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SavedItinerarySummary[] = JSON.parse(stored);
        setItems(sortByRecent(parsed));
      }
    } catch {
      // 손상된 데이터는 무시
    }
  }, []);

  const add = (summary: SavedItinerarySummary) => {
    setItems((prev) => {
      const next = sortByRecent([
        summary,
        ...prev.filter((i) => i.itineraryId !== summary.itineraryId),
      ]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const remove = (itineraryId: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.itineraryId !== itineraryId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { items, add, remove };
}
