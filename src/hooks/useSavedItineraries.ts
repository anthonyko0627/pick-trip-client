"use client";

import { useEffect } from "react";

import { useSavedItinerariesStore } from "@/stores/savedItinerariesStore";

// 전역 저장 일정 스토어를 구독하는 얇은 훅. 여러 컴포넌트 인스턴스가 상태를 공유한다.
export function useSavedItineraries() {
  const hydrate = useSavedItinerariesStore((s) => s.hydrate);

  // 마운트 시 1회 localStorage에서 로드한다(이미 hydrated면 스토어가 무시).
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const items = useSavedItinerariesStore((s) => s.items);
  const add = useSavedItinerariesStore((s) => s.add);
  const remove = useSavedItinerariesStore((s) => s.remove);

  return { items, add, remove };
}
