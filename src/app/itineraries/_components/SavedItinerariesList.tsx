"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/hooks/useAuth";
import { useItineraryMapSnapshots } from "@/hooks/useItineraryMapSnapshots";
import { useSavedItineraries } from "@/hooks/useSavedItineraries";
import { parseApiError } from "@/lib/errors";
import {
  formatDistanceKm,
  formatDuration,
  sumRouteTravel,
} from "@/lib/itinerary";
import { fromSnapshot } from "@/lib/itineraryMapSnapshot";
import { cn } from "@/lib/utils";
import { getItinerary } from "@/services/itineraryService";
import type { ItineraryResponse } from "@/types/itinerary";
import { REGION_LABELS } from "@/types/region";
import { SavedItineraryDetail } from "./SavedItineraryDetail";

type DetailState =
  | { status: "loading" }
  | { status: "loaded"; data: ItineraryResponse }
  | { status: "error"; message: string };

// "N일 전 저장" 형태의 상대 시간. 핸드오프 스펙(8번 "저장한 일정")의
// 행 메타 정보 중 하나다.
function formatSavedAgo(savedAt: number) {
  const days = Math.floor((Date.now() - savedAt) / 86400000);
  if (days <= 0) return "오늘";
  return `${days}일 전`;
}

// 펼친 행 메타 끝에 붙는 "N곳 · N.Nkm" — 전체 장소 수 · 전체 이동 거리.
// 지도 스냅샷(route 있는 날만 합산)이 있을 때만 값을 낸다. 스냅샷이 없거나
// 어떤 날도 route가 없으면 null(=렌더 안 함) — 직선거리로 대체하지 않는다.
function totalTravelMeta(
  detail: DetailState | undefined,
  snapshot: unknown,
): string | null {
  if (detail?.status !== "loaded") return null;
  const mapData = fromSnapshot(snapshot);
  if (!mapData) return null;
  const travel = sumRouteTravel(mapData.days);
  if (!travel) return null;
  const km = formatDistanceKm(travel.km);
  if (!km) return null;
  const totalPlaces = detail.data.days.reduce(
    (sum, day) => sum + day.items.length,
    0,
  );
  return `${totalPlaces}곳 · ${km}`;
}

export function SavedItinerariesList() {
  const { items, remove } = useSavedItineraries();
  const { snapshots, removeSnapshot } = useItineraryMapSnapshots();
  const { runAuthed } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});

  async function fetchDetail(itineraryId: string) {
    setDetails((prev) => ({ ...prev, [itineraryId]: { status: "loading" } }));
    try {
      const data = await runAuthed((token) => getItinerary(itineraryId, token));
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
        const travelMeta = totalTravelMeta(detail, snapshots[item.itineraryId]);

        return (
          <li
            key={item.itineraryId}
            className="rounded-[20px] border border-border bg-card"
          >
            {/* li 자체엔 overflow-hidden을 두지 않는다 — 펼친 영역의 지도가
                lg:sticky로 스크롤을 따라가야 하는데, 조상에 overflow:hidden이
                있으면 sticky가 무효화된다. 대신 펼침 배경이 있는 헤더 행에만
                rounded-t로 li의 위쪽 라운드를 맞춘다. */}
            <div
              className={cn(
                "flex items-center gap-4.5 rounded-t-[20px] p-5.5",
                isExpanded &&
                  "border-b border-[oklch(0.94_0.012_30)] bg-[oklch(0.985_0.012_30)]",
              )}
            >
              <div className="flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.68_0.19_32)] to-[oklch(0.56_0.2_20)] text-center text-[11px] leading-tight font-extrabold text-white">
                <span>{REGION_LABELS[item.region]}</span>
                <span>{formatDuration(item.duration)}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[19px] font-bold tracking-tight text-foreground">
                  {item.title}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-3.5 text-[12.5px] text-muted-foreground">
                  <span>{item.travelDate}</span>
                  <span>{formatDuration(item.duration)}</span>
                  <span>{formatSavedAgo(item.savedAt)} 저장</span>
                  {travelMeta && (
                    <span className="font-bold text-primary">{travelMeta}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    remove(item.itineraryId);
                    removeSnapshot(item.itineraryId);
                  }}
                  className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                >
                  목록에서 지우기
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(item.itineraryId)}
                  className={cn(
                    "rounded-[11px] px-4.5 py-2.5 text-[13px] font-bold transition-colors",
                    isExpanded
                      ? "border border-[oklch(0.85_0.06_30)] bg-[oklch(0.955_0.04_30)] text-[oklch(0.52_0.19_28)]"
                      : "bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                >
                  {isExpanded ? "접기" : "보기"}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="p-5.5 pt-4">
                {detail?.status === "loading" && (
                  <p className="text-sm text-muted-foreground">
                    불러오는 중...
                  </p>
                )}
                {detail?.status === "error" && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-destructive">{detail.message}</p>
                    <button
                      type="button"
                      onClick={() => fetchDetail(item.itineraryId)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                    >
                      다시 시도
                    </button>
                  </div>
                )}
                {detail?.status === "loaded" && (
                  <SavedItineraryDetail
                    data={detail.data}
                    mapData={
                      fromSnapshot(snapshots[detail.data.itineraryId]) ??
                      undefined
                    }
                    itineraryId={detail.data.itineraryId}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
