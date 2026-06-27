import type { ItineraryDay } from "@/types/itinerary";
import { PlaceItem } from "./PlaceItem";

interface DayCardProps {
  day: ItineraryDay;
}

export function DayCard({ day }: DayCardProps) {
  const parts = day.date.split("-");
  const month = Number(parts[1]);
  const dayOfMonth = Number(parts[2]);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">
        {day.dayNumber}일차 · {month}월 {dayOfMonth}일
      </h3>
      <div className="mt-2 divide-y">
        {day.places.map((place) => (
          <PlaceItem key={place.contentId} place={place} />
        ))}
      </div>
    </div>
  );
}
