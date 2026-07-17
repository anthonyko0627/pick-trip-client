import { create } from "zustand";

import type { SavedItinerarySummary } from "@/types/itinerary";

const STORAGE_KEY = "pick-trip-saved-itineraries";

// savedAt 내림차순(최신 우선) 정렬한다.
function sortByRecent(items: SavedItinerarySummary[]) {
  return [...items].sort((a, b) => b.savedAt - a.savedAt);
}

interface SavedItinerariesState {
  items: SavedItinerarySummary[];
  // 초기 렌더는 빈 배열이고, 마운트 시 localStorage에서 1회 로드한다.
  hydrated: boolean;
  hydrate: () => void;
  add: (summary: SavedItinerarySummary) => void;
  remove: (itineraryId: string) => void;
}

// raw 배열 JSON 형태 그대로 저장한다(persist 래퍼를 쓰지 않는다).
function persist(items: SavedItinerarySummary[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const useSavedItinerariesStore = create<SavedItinerariesState>(
  (set, get) => ({
    items: [],
    hydrated: false,

    hydrate: () => {
      if (get().hydrated) return;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SavedItinerarySummary[] = JSON.parse(stored);
          set({ items: sortByRecent(parsed) });
        }
      } catch {
        // 손상된 데이터는 무시
      }
      set({ hydrated: true });
    },

    add: (summary) => {
      // 같은 itineraryId는 제거 후 최신 정보로 다시 넣고 정렬한다.
      const next = sortByRecent([
        summary,
        ...get().items.filter((i) => i.itineraryId !== summary.itineraryId),
      ]);
      persist(next);
      set({ items: next });
    },

    remove: (itineraryId) => {
      const next = get().items.filter((i) => i.itineraryId !== itineraryId);
      persist(next);
      set({ items: next });
    },
  }),
);
