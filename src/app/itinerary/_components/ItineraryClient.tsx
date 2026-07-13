"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useBasket } from "@/hooks/useBasket";
import { type ParsedApiError, parseApiError } from "@/lib/errors";
import {
  addBasketItem,
  updateBasketConditions,
} from "@/services/basketService";
import { generateItinerary, saveItinerary } from "@/services/itineraryService";
import type { BasketItem } from "@/types/basket";
import { BASKET_PRIORITY_TO_SERVER } from "@/types/basket";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";
import type { Region } from "@/types/region";
import {
  COMPANION_CONDITION_TO_SERVER,
  type CompanionCondition,
} from "@/types/travel-condition";
import { ErrorState } from "./ErrorState";
import { GeneratingState } from "./GeneratingState";
import { ItineraryResult } from "./ItineraryResult";
import { ShareButton } from "./ShareButton";
import { TripSummary } from "./TripSummary";

type ItineraryPhase =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "preview";
      data: ItineraryGenerateResponse;
      error?: ParsedApiError;
    }
  | { status: "loginPreview"; data: ItineraryGenerateResponse }
  | { status: "saving"; data: ItineraryGenerateResponse }
  | { status: "saved"; data: ItineraryResponse }
  | { status: "error"; message: string; code?: string; traceId?: string };

// 로그인 기능이 아직 구현되지 않아 generate가 401 AUTH_REQUIRED를 반환하는 동안,
// 결과 화면 UX를 확인할 수 있도록 바구니 콘텐츠로 로컬 미리보기 데이터를 만든다.
function buildLoginPreviewItinerary(
  items: BasketItem[],
  region: Region,
  startDate: string,
  nights: number,
): ItineraryGenerateResponse {
  const dayCount = nights + 1;
  const days = Array.from({ length: dayCount }, (_, dayIndex) => ({
    dayId: `preview-day-${dayIndex}`,
    dayIndex,
    items: [] as ItineraryGenerateResponse["days"][number]["items"],
  }));

  items.forEach((item, index) => {
    const day = days[index % dayCount];
    day.items.push({
      itemId: `preview-item-${index}`,
      contentId: item.content.id,
      title: item.content.name,
      order: day.items.length,
      reason: "담아주신 콘텐츠를 기반으로 만든 미리보기 일정입니다.",
      pinned: item.priority === "MUST",
    });
  });

  return {
    title: "미리보기 일정",
    region,
    travelDate: startDate,
    duration: nights,
    days,
  };
}

interface ItineraryClientProps {
  regions: string;
  startDate: string;
  nights: string;
  companions: string;
}

export function ItineraryClient({
  regions,
  startDate,
  nights,
  companions,
}: ItineraryClientProps) {
  const [phase, setPhase] = useState<ItineraryPhase>({ status: "idle" });
  const { items } = useBasket();

  const parsedRegions = regions.split(",").filter(Boolean) as Region[];
  const parsedNights = Number(nights) || 0;
  const parsedCompanions = companions
    .split(",")
    .filter(Boolean) as CompanionCondition[];

  async function handleGenerate() {
    if (phase.status === "loading") return;

    setPhase({ status: "loading" });

    try {
      // generate는 요청 바디를 받지 않고 서버에 저장된 바구니/조건을 읽어 생성하므로,
      // 호출 전에 현재 바구니/조건을 서버에 반영한다.
      await updateBasketConditions({
        region: parsedRegions[0],
        travelDate: startDate,
        duration: parsedNights,
        companions: parsedCompanions.map(
          (c) => COMPANION_CONDITION_TO_SERVER[c],
        ),
      });

      for (const item of items) {
        try {
          await addBasketItem({
            contentId: item.content.id,
            priority: BASKET_PRIORITY_TO_SERVER[item.priority ?? "OPTIONAL"],
            title: item.content.name,
            ...(item.content.imageUrl
              ? { thumbnailUrl: item.content.imageUrl }
              : {}),
          });
        } catch (err) {
          const parsed = parseApiError(err);
          if (parsed.code !== "BASKET_ITEM_DUPLICATE") throw err;
        }
      }

      const data = await generateItinerary();
      setPhase({ status: "preview", data });
    } catch (err) {
      const { message, code, traceId } = parseApiError(err);
      if (code === "AUTH_REQUIRED") {
        const data = buildLoginPreviewItinerary(
          items,
          parsedRegions[0],
          startDate,
          parsedNights,
        );
        setPhase({ status: "loginPreview", data });
        return;
      }
      setPhase({ status: "error", message, code, traceId });
    }
  }

  async function handleSave() {
    if (phase.status !== "preview") return;
    const previewData = phase.data;

    setPhase({ status: "saving", data: previewData });

    try {
      const request: SaveItineraryRequest = {
        title: previewData.title,
        region: previewData.region,
        travelDate: previewData.travelDate,
        duration: previewData.duration,
        days: previewData.days.map((day) => ({
          dayIndex: day.dayIndex,
          items: day.items.map((item) => ({
            contentId: item.contentId,
            title: item.title,
            order: item.order,
            reason: item.reason,
            pinned: item.pinned,
          })),
        })),
      };
      const saved = await saveItinerary(request);
      setPhase({ status: "saved", data: saved });
    } catch (err) {
      const parsed = parseApiError(err);
      setPhase({ status: "preview", data: previewData, error: parsed });
    }
  }

  if (phase.status === "saved") {
    return (
      <div className="space-y-4">
        <ItineraryResult data={phase.data} />
        <p className="text-sm text-green-600">일정이 저장되었습니다.</p>
        <ShareButton itineraryId={phase.data.itineraryId} />
      </div>
    );
  }

  if (phase.status === "loginPreview") {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
          로그인 기능은 준비 중입니다. 지금 보시는 일정은 담아주신 콘텐츠를
          기반으로 만든 예시이며, 로그인 후 실제 AI 일정 생성/저장 기능을 이용할
          수 있어요.
        </p>
        <ItineraryResult data={phase.data} />
        <Button variant="outline" onClick={() => setPhase({ status: "idle" })}>
          다시 생성
        </Button>
      </div>
    );
  }

  if (phase.status === "preview" || phase.status === "saving") {
    return (
      <div className="space-y-4">
        <ItineraryResult data={phase.data} />
        {phase.status === "preview" && phase.error && (
          <p className="text-sm text-red-600">
            {phase.error.message}
            {phase.error.traceId && ` (참고: ${phase.error.traceId})`}
          </p>
        )}
        <div className="flex gap-2">
          <Button disabled={phase.status === "saving"} onClick={handleSave}>
            {phase.status === "saving" ? "저장 중..." : "저장"}
          </Button>
          <Button
            variant="outline"
            disabled={phase.status === "saving"}
            onClick={() => setPhase({ status: "idle" })}
          >
            다시 생성
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TripSummary
        regions={parsedRegions}
        startDate={startDate}
        nights={parsedNights}
        companions={parsedCompanions}
        items={items}
      />

      {phase.status === "loading" && <GeneratingState />}
      {phase.status === "error" && (
        <ErrorState
          message={phase.message}
          traceId={phase.traceId}
          onRetry={handleGenerate}
        />
      )}

      <div className="space-y-2">
        {items.length < 2 && phase.status === "idle" && (
          <p className="text-sm text-gray-500">
            2개 이상 담아야 일정을 생성할 수 있어요
          </p>
        )}
        <Button
          disabled={phase.status === "loading" || items.length < 2}
          onClick={handleGenerate}
        >
          일정 생성하기
        </Button>
      </div>
    </div>
  );
}
