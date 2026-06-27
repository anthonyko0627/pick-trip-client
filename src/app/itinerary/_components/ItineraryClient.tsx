"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useBasket } from "@/hooks/useBasket";
import { parseApiError } from "@/lib/errors";
import { generateItinerary } from "@/services/itineraryService";
import type { GenerateItineraryResponse } from "@/types/itinerary";
import type { Region } from "@/types/region";
import type { CompanionCondition } from "@/types/travel-condition";
import { ErrorState } from "./ErrorState";
import { GeneratingState } from "./GeneratingState";
import { ItineraryResult } from "./ItineraryResult";
import { TripSummary } from "./TripSummary";

type ItineraryPhase =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; data: GenerateItineraryResponse }
  | { status: "error"; message: string; code?: string; traceId?: string };

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
      const data = await generateItinerary({
        regions: parsedRegions,
        startDate,
        nights: parsedNights,
        companions: parsedCompanions,
        contents: items.map((item) => ({
          contentId: item.content.id,
          priority: item.priority,
        })),
      });
      setPhase({ status: "result", data });
    } catch (err) {
      const { message, code, traceId } = parseApiError(err);
      setPhase({ status: "error", message, code, traceId });
    }
  }

  if (phase.status === "result") {
    return (
      <div className="space-y-4">
        <ItineraryResult data={phase.data} />
        <Button variant="outline" onClick={() => setPhase({ status: "idle" })}>
          다시 생성
        </Button>
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
