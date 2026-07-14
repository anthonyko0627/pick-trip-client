"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  type CompanionCondition,
  DURATION_PRESETS,
  type TravelDuration,
} from "@/types/travel-condition";

import { CompanionSelector } from "./CompanionSelector";
import { DurationSelector } from "./DurationSelector";
import { StartDateInput } from "./StartDateInput";

interface TravelDateFormProps {
  regions: string;
}

export function TravelDateForm({ regions }: TravelDateFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState<TravelDuration | null>(null);
  const [customNights, setCustomNights] = useState(0);
  const [companions, setCompanions] = useState<CompanionCondition[]>([]);

  function resolveNights(): number {
    if (!duration) return -1;
    if (duration !== "CUSTOM") {
      return DURATION_PRESETS.find((p) => p.value === duration)?.nights ?? -1;
    }
    return customNights;
  }

  const nights = resolveNights();
  const isValid =
    startDate !== "" &&
    duration !== null &&
    (duration !== "CUSTOM" || customNights >= 1);

  function handleNext() {
    if (!isValid) return;
    const params = new URLSearchParams({
      regions,
      startDate,
      nights: String(nights),
    });
    if (companions.length > 0) {
      params.set("companions", companions.join(","));
    }
    router.push(`/contents?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <StartDateInput value={startDate} onChange={setStartDate} />
      <DurationSelector
        value={duration}
        customNights={customNights}
        onSelect={setDuration}
        onCustomNightsChange={setCustomNights}
      />

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">동행 조건</p>
        <CompanionSelector value={companions} onChange={setCompanions} />
        <p className="text-xs text-muted-foreground">선택하지 않아도 됩니다</p>
      </div>

      {isValid && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-700">
          {startDate} 출발 ·{" "}
          {nights === 0 ? "당일치기" : `${nights}박 ${nights + 1}일`}
          {companions.length > 0 && ` · 동행 조건 ${companions.length}개`}
        </div>
      )}

      <Button
        size="lg"
        disabled={!isValid}
        onClick={handleNext}
        className="mt-2 w-full sm:w-auto sm:self-end"
      >
        다음
      </Button>
    </div>
  );
}
