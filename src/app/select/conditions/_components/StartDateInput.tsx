"use client";

interface StartDateInputProps {
  value: string;
  onChange: (date: string) => void;
}

export function StartDateInput({ value, onChange }: StartDateInputProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="start-date"
        className="text-sm font-medium text-foreground"
      >
        출발 날짜
      </label>
      <input
        id="start-date"
        type="date"
        min={today}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
