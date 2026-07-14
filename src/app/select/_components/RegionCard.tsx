"use client";

import { cn } from "@/lib/utils";
import {
  REGION_COLORS,
  REGION_DESCRIPTIONS,
  REGION_LABELS,
  type Region,
} from "@/types/region";

interface RegionCardProps {
  region: Region;
  selected: boolean;
  onToggle: (region: Region) => void;
}

export function RegionCard({ region, selected, onToggle }: RegionCardProps) {
  const color = REGION_COLORS[region];
  const label = REGION_LABELS[region];

  return (
    <button
      type="button"
      onClick={() => onToggle(region)}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
        selected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      {/* 지역 아바타 */}
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-white"
        style={{
          background: `linear-gradient(135deg, ${color}99, ${color}55)`,
        }}
      >
        {label[0]}
      </div>

      {/* 지역 정보 */}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-base font-semibold text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">
          {REGION_DESCRIPTIONS[region]}
        </span>
      </div>

      {/* 체크박스 */}
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          selected
            ? "border-primary bg-primary"
            : "border-border bg-background",
        )}
      >
        {selected && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
}
