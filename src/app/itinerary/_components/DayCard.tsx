import type { Day } from "@/types/itinerary";
import { PlaceItem } from "./PlaceItem";

interface DayCardProps {
  day: Day;
}

export function DayCard({ day }: DayCardProps) {
  // dayIndex가 0-based인지 1-based인지 백엔드 확인 전까지는 0-based로 가정한다.
  const dayNumber = day.dayIndex + 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
        {dayNumber}일차
      </h3>
      <div className="mt-2 divide-y divide-border">
        {day.items.map((item) => (
          <PlaceItem key={item.itemId} item={item} />
        ))}
      </div>
    </div>
  );
}
