"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { parseApiError } from "@/lib/errors";
import { getContents } from "@/services/contentService";
import type { Content } from "@/types/content";
import type { Region } from "@/types/region";

interface AlternativePlacePickerProps {
  region: Region;
  travelDate: string;
  duration: number;
  onSelect: (content: Content) => void;
  onClose: () => void;
}

type PickerState =
  | { status: "loading" }
  | { status: "loaded"; contents: Content[] }
  | { status: "error"; message: string };

export function AlternativePlacePicker({
  region,
  travelDate,
  duration,
  onSelect,
  onClose,
}: AlternativePlacePickerProps) {
  const [state, setState] = useState<PickerState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    getContents({ regions: [region], startDate: travelDate, nights: duration })
      .then((res) => {
        if (!cancelled) setState({ status: "loaded", contents: res.contents });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: "error", message: parseApiError(err).message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [region, travelDate, duration]);

  return (
    <div
      data-testid="alternative-place-picker-overlay"
      className="fixed inset-0 z-50"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div className="absolute right-0 bottom-0 left-0 max-h-[70vh] rounded-t-2xl bg-card">
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="font-semibold">대체 장소 선택</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-6">
          {state.status === "loading" && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              불러오는 중...
            </p>
          )}
          {state.status === "error" && (
            <p className="py-8 text-center text-sm text-red-600">
              {state.message}
            </p>
          )}
          {state.status === "loaded" && state.contents.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              추천할 대체 장소가 없습니다
            </p>
          )}
          {state.status === "loaded" && state.contents.length > 0 && (
            <ul className="flex flex-col gap-2">
              {state.contents.map((content) => (
                <li
                  key={content.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <p className="truncate text-sm font-medium">{content.name}</p>
                  <Button size="sm" onClick={() => onSelect(content)}>
                    이 장소로 교체
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
