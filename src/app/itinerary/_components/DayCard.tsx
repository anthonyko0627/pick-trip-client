import type { Day } from "@/types/itinerary";
import { PlaceItem } from "./PlaceItem";

interface DayCardProps {
  day: Day;
  onMoveItem?: (
    dayId: string,
    itemId: string,
    direction: "up" | "down",
  ) => void;
  onRemoveItem?: (dayId: string, itemId: string) => void;
  onTogglePinned?: (dayId: string, itemId: string) => void;
  onOpenReplacePicker?: (dayId: string, itemId: string) => void;
}

export function DayCard({
  day,
  onMoveItem,
  onRemoveItem,
  onTogglePinned,
  onOpenReplacePicker,
}: DayCardProps) {
  // dayIndex가 0-based인지 1-based인지 백엔드 확인 전까지는 0-based로 가정한다.
  const dayNumber = day.dayIndex + 1;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{dayNumber}일차</h3>
      <div className="mt-2 divide-y">
        {day.items.map((item, index) => (
          <PlaceItem
            key={item.itemId}
            item={item}
            isFirst={index === 0}
            isLast={index === day.items.length - 1}
            onMoveUp={
              onMoveItem
                ? () => onMoveItem(day.dayId, item.itemId, "up")
                : undefined
            }
            onMoveDown={
              onMoveItem
                ? () => onMoveItem(day.dayId, item.itemId, "down")
                : undefined
            }
            onRemove={
              onRemoveItem
                ? () => onRemoveItem(day.dayId, item.itemId)
                : undefined
            }
            onTogglePinned={
              onTogglePinned
                ? () => onTogglePinned(day.dayId, item.itemId)
                : undefined
            }
            onOpenReplacePicker={
              onOpenReplacePicker
                ? () => onOpenReplacePicker(day.dayId, item.itemId)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
