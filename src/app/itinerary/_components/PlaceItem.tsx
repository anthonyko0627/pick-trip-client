"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Item } from "@/types/itinerary";

interface PlaceItemProps {
  item: Item;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  onTogglePinned?: () => void;
  onOpenReplacePicker?: () => void;
}

export function PlaceItem({
  item,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onTogglePinned,
  onOpenReplacePicker,
}: PlaceItemProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const editable = Boolean(
    onMoveUp || onMoveDown || onRemove || onTogglePinned || onOpenReplacePicker,
  );

  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{item.title}</p>
        {item.pinned && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
            📌 고정
          </span>
        )}
      </div>
      {item.reason && (
        <p className="mt-1 text-xs text-gray-400">{item.reason}</p>
      )}

      {editable && (
        <div className="mt-2 flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label="위로 이동"
          >
            ▲
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label="아래로 이동"
          >
            ▼
          </Button>
          <Button
            type="button"
            variant={item.pinned ? "secondary" : "outline"}
            size="sm"
            onClick={onTogglePinned}
          >
            📌 {item.pinned ? "고정됨" : "고정"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenReplacePicker}
          >
            대체 장소
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirmingRemove) {
                onRemove?.();
                setConfirmingRemove(false);
              } else {
                setConfirmingRemove(true);
              }
            }}
          >
            {confirmingRemove ? "정말 삭제?" : "삭제"}
          </Button>
        </div>
      )}
    </div>
  );
}
