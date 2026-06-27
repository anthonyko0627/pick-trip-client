import type { ItineraryPlace } from "@/types/itinerary";

interface PlaceItemProps {
  place: ItineraryPlace;
}

export function PlaceItem({ place }: PlaceItemProps) {
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{place.name}</p>
        {place.needsVerification && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            방문 전 확인 필요
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-600">
        {place.startTime} ~ {place.endTime}
      </p>
      <p className="text-sm text-gray-600">예상 체류: {place.stayDuration}</p>
      <p className="mt-1 text-xs text-gray-400">{place.reason}</p>
    </div>
  );
}
