"use client";

import { useState } from "react";

import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { Button } from "@/components/ui/button";
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
    return <p className="text-sm text-gray-500">아직 저장한 일정이 없습니다</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const isExpanded = expandedId === item.itineraryId;
        const detail = details[item.itineraryId];

        return (
          <li key={item.itineraryId} className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-gray-500">
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
              <div className="mt-4">
                {detail?.status === "loading" && (
                  <p className="text-sm text-gray-500">불러오는 중...</p>
                )}
                {detail?.status === "error" && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-red-600">{detail.message}</p>
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
