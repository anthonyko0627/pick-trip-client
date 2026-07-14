"use client";

import { cn } from "@/lib/utils";
import {
  DURATION_PRESETS,
  type TravelDuration,
} from "@/types/travel-condition";

interface DurationSelectorProps {
  value: TravelDuration | null;
  customNights: number;
  onSelect: (duration: TravelDuration) => void;
  onCustomNightsChange: (nights: number) => void;
}

export function DurationSelector({
  value,
  customNights,
  onSelect,
  onCustomNightsChange,
}: DurationSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-foreground">여행 기간</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {DURATION_PRESETS.map((preset) => {
          const selected = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onSelect(preset.value)}
              aria-pressed={selected}
              className={cn(
                "rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {value === "CUSTOM" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <label
            htmlFor="custom-nights"
            className="text-sm text-muted-foreground"
          >
            박 수
          </label>
          <input
            id="custom-nights"
            type="number"
            min={1}
            max={30}
            value={customNights || ""}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n >= 1) onCustomNightsChange(n);
            }}
            placeholder="예: 3"
            className="h-9 w-20 rounded-md border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm text-muted-foreground">박</span>
          {customNights > 0 && (
            <span className="ml-auto text-sm font-medium text-foreground">
              {customNights}박 {customNights + 1}일
            </span>
          )}
        </div>
      )}
    </div>
  );
}
