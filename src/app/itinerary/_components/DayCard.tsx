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
  // 백엔드는 dayIndex를 1부터 채번한다(OpenAiItineraryClient 시스템 프롬프트,
  // ItineraryServiceTest 등 서버 픽스처 전부 1부터 시작). 그대로 표시한다.
  const dayNumber = day.dayIndex;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
        {dayNumber}일차
      </h3>
      <div className="mt-2 divide-y divide-border">
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
