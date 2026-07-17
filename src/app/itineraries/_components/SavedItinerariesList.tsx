"use client";

import { useState } from "react";

import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import { parseApiError } from "@/lib/errors";
import { getItinerary } from "@/services/itineraryService";
import type { ItineraryResponse } from "@/types/itinerary";
import { REGION_LABELS } from "@/types/region";

type DetailState =
  | { status: "loading" }
  | { status: "loaded"; data: ItineraryResponse }
  | { status: "error"; message: string };

function formatDuration(duration: number) {
  return duration === 0 ? "당일치기" : `${duration}박 ${duration + 1}일`;
}

export function SavedItinerariesList() {
  const { items, remove } = useSavedItineraries();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});

  async function fetchDetail(itineraryId: string) {
    setDetails((prev) => ({ ...prev, [itineraryId]: { status: "loading" } }));
    try {
      const data = await getItinerary(itineraryId);
      setDetails((prev) => ({
        ...prev,
        [itineraryId]: { status: "loaded", data },
      }));
    } catch (err) {
      setDetails((prev) => ({
        ...prev,
        [itineraryId]: { status: "error", message: parseApiError(err).message },
      }));
    }
  }

  function handleToggle(itineraryId: string) {
    if (expandedId === itineraryId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(itineraryId);
    if (!details[itineraryId] || details[itineraryId].status === "error") {
      fetchDetail(itineraryId);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
        <Icon name="bookmark" size={32} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          아직 저장한 일정이 없습니다
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const isExpanded = expandedId === item.itineraryId;
        const detail = details[item.itineraryId];

        return (
          <li
            key={item.itineraryId}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50">
                <Icon name="bookmark" size={22} className="text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {REGION_LABELS[item.region]} · {item.travelDate} ·{" "}
                  {formatDuration(item.duration)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(item.itineraryId)}
                >
                  {isExpanded ? "접기" : "보기"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(item.itineraryId)}
                >
                  목록에서 지우기
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 border-t border-border pt-4">
                {detail?.status === "loading" && (
                  <p className="text-sm text-muted-foreground">
                    불러오는 중...
                  </p>
                )}
                {detail?.status === "error" && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-destructive">{detail.message}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchDetail(item.itineraryId)}
                    >
                      다시 시도
                    </Button>
                  </div>
                )}
                {detail?.status === "loaded" && (
                  <ItineraryResult data={detail.data} />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
