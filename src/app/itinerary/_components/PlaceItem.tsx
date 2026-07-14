"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
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
    <div className="flex gap-3 py-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
        {item.order + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-foreground">{item.title}</p>
          {item.pinned && (
            <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
              고정
            </span>
          )}
        </div>
        {item.reason && (
          <p className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal-700">
            <Icon
              name="wand"
              size={13}
              className="mt-0.5 shrink-0 text-teal-600"
            />
            <span>{item.reason}</span>
          </p>
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
              {item.pinned ? "고정됨" : "고정"}
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
    </div>
  );
}
