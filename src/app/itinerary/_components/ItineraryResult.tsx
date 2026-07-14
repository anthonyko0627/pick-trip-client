import type { Day } from "@/types/itinerary";
import { DayCard } from "./DayCard";

interface ItineraryResultProps {
  data: { days: Day[] };
}

export function ItineraryResult({ data }: ItineraryResultProps) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground">생성된 일정</h2>
      {data.days.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          생성된 일정이 없습니다
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {data.days.map((day) => (
            <DayCard key={day.dayId} day={day} />
          ))}
        </div>
      )}
    </section>
  );
}
