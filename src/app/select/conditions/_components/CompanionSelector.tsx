"use client";

import {
  COMPANION_CONDITIONS,
  type CompanionCondition,
} from "@/types/travel-condition";

interface CompanionSelectorProps {
  value: CompanionCondition[];
  onChange: (value: CompanionCondition[]) => void;
}

export function CompanionSelector({ value, onChange }: CompanionSelectorProps) {
  function toggle(condition: CompanionCondition) {
    if (value.includes(condition)) {
      onChange(value.filter((c) => c !== condition));
    } else {
      onChange([...value, condition]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {COMPANION_CONDITIONS.map((c) => {
        const selected = value.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(c.value)}
            className={
              selected
                ? "rounded-full border border-primary bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                : "rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/40"
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
