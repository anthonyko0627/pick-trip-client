import type { Item } from "@/types/itinerary";

interface PlaceItemProps {
  item: Item;
}

export function PlaceItem({ item }: PlaceItemProps) {
  return (
    <div className="py-3">
      <p className="font-semibold">{item.title}</p>
      {item.reason && (
        <p className="mt-1 text-xs text-gray-400">{item.reason}</p>
      )}
    </div>
  );
}
