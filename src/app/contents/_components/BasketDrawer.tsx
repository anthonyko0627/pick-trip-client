"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { BasketItem, BasketPriority } from "@/types/basket";
import { PRIORITY_LABELS, PRIORITY_SELECTED_CLASSES } from "@/types/basket";
import { CATEGORY_LABELS } from "@/types/content";

const PRIORITY_LEVELS = ["MUST", "SHOULD", "OPTIONAL"] as const;

interface BasketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: BasketItem[];
  onRemove: (contentId: string) => void;
  onSetPriority: (contentId: string, priority: BasketPriority | null) => void;
  onClear: () => void;
  canGenerate: boolean;
  onGenerate: () => void;
}

export function BasketDrawer({
  isOpen,
  onClose,
  items,
  onRemove,
  onSetPriority,
  onClear,
  canGenerate,
  onGenerate,
}: BasketDrawerProps) {
  return (
    <div
      data-testid="basket-drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 lg:hidden",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        data-testid="basket-drawer-backdrop"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl bg-card transition-transform duration-300",
          isOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Icon name="bookmark" size={16} className="text-primary" />
            여행 바구니{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {items.length}개
            </span>
          </h2>
          <div className="flex items-center gap-3">
            {items.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                전체 비우기
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="바구니 닫기"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-6">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
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
                      {item.content.category && (
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[item.content.category]}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(item.content.id)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`${item.content.name} 삭제`}
                    >
                      <Icon name="trash" size={14} />
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
                            ? PRIORITY_SELECTED_CLASSES[level]
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
            <Button
              className="w-full"
              disabled={!canGenerate}
              onClick={onGenerate}
            >
              AI 일정 생성
            </Button>
            {!canGenerate && (
              <p className="text-center text-xs text-muted-foreground">
                2개 이상 담으면 일정을 만들 수 있어요
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
