"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BasketItem, BasketPriority } from "@/types/basket";
import { PRIORITY_LABELS } from "@/types/basket";
import { CATEGORY_LABELS } from "@/types/content";

interface BasketPanelProps {
  items: BasketItem[];
  onRemove: (contentId: string) => void;
  onSetPriority: (contentId: string, priority: BasketPriority | null) => void;
  onClear: () => void;
  canGenerate: boolean;
  onGenerate: () => void;
}

const PRIORITY_LEVELS = ["MUST", "SHOULD", "OPTIONAL"] as const;

export function BasketPanel({
  items,
  onRemove,
  onSetPriority,
  onClear,
  canGenerate,
  onGenerate,
}: BasketPanelProps) {
  return (
    <div className="sticky top-4 rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">
          여행 바구니{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {items.length}개
          </span>
        </h2>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            전체 비우기
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          담은 콘텐츠가 없습니다
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.content.id}
              className="rounded-lg bg-muted/50 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {item.content.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[item.content.category]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.content.id)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                  aria-label={`${item.content.name} 삭제`}
                >
                  삭제
                </button>
              </div>

              <div className="mt-2 flex gap-1">
                {PRIORITY_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      onSetPriority(
                        item.content.id,
                        item.priority === level ? null : level,
                      )
                    }
                    className={cn(
                      "flex-1 rounded px-1 py-0.5 text-[10px] transition-colors",
                      item.priority === level
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {PRIORITY_LABELS[level]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <Button className="w-full" disabled={!canGenerate} onClick={onGenerate}>
          AI 일정 생성
        </Button>
        {!canGenerate && (
          <p className="text-center text-xs text-muted-foreground">
            2개 이상 담으면 일정을 만들 수 있어요
          </p>
        )}
      </div>
    </div>
  );
}
