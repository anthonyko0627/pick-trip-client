"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  formatIncline,
  formatTravelMinutes,
  stayMinutes,
} from "@/lib/itinerary";
import { cn } from "@/lib/utils";
import type { Item } from "@/types/itinerary";

interface PlaceItemProps {
  item: Item;
  isFirst?: boolean;
  isLast?: boolean;
  // 일정 생성 요청에 startContentId로 지정한 장소인지. 신규 생성 직후
  // 미리보기 화면에서만 안다(저장된 일정 재조회 경로는 원래 요청값을 모른다).
  isStartPoint?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  onTogglePinned?: () => void;
  onOpenReplacePicker?: () => void;
  // AI 추천(addedByAi) 배지를 저장 전 바로 지우는 전용 액션. 일반 삭제
  // (onRemove, 확인 단계 있음)와 별개로 미리보기(저장 전) 화면에서만 쓴다 —
  // 저장 후 화면은 이미 있는 삭제 버튼을 그대로 쓴다.
  onDismissAiSuggestion?: () => void;
}

// 시간축 타임라인의 한 행. 3열 그리드(62px 시각 / 26px 번호원·레일 / 1fr 카드)에
// 직접 놓이도록 Fragment로 세 칸을 반환한다.
export function PlaceItem({
  item,
  isFirst,
  isLast,
  isStartPoint,
  onMoveUp,
  onMoveDown,
  onRemove,
  onTogglePinned,
  onOpenReplacePicker,
  onDismissAiSuggestion,
}: PlaceItemProps) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const editable = Boolean(
    onMoveUp || onMoveDown || onRemove || onTogglePinned || onOpenReplacePicker,
  );
  const stay = stayMinutes(item.startTime, item.endTime);
  const stayLabel = stay ? formatTravelMinutes(stay) : null;
  const inclineLabel = formatIncline(
    item.inclinePenaltyMinutes,
    item.elevationGainMeters,
  );
  const notes = item.notes ?? [];

  return (
    <>
      {/* 1열: 시각 — 방문 시각이 없어도 열은 항상 유지해 타임라인 정렬이
          흐트러지지 않게 한다. */}
      <div className="min-h-[2.5rem] pt-1 text-right">
        {item.startTime ? (
          <>
            <p className="text-[15px] font-extrabold tabular-nums text-primary">
              {item.startTime}
            </p>
            {item.endTime && (
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {item.endTime}
              </p>
            )}
          </>
        ) : (
          <p
            aria-hidden="true"
            className="text-[15px] font-extrabold text-muted-foreground/40"
          >
            ·
          </p>
        )}
      </div>

      {/* 2열: 번호 원 + 레일 */}
      <div className="relative flex justify-center">
        <span
          className={cn(
            "absolute left-1/2 w-0.5 -translate-x-1/2 bg-border",
            isFirst ? "top-3.5" : "top-0",
            isLast ? "h-3.5" : "bottom-0",
          )}
        />
        <span className="relative z-10 mt-1 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-card bg-primary text-[11px] font-extrabold text-primary-foreground">
          {item.order + 1}
        </span>
      </div>

      {/* 3열: 장소 카드 */}
      <div className="min-w-0 pb-4">
        <div className="rounded-[16px] border border-border bg-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[15.5px] font-bold tracking-[-0.025em] text-foreground">
                  {item.title}
                </p>
                {item.pinned && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <Icon name="pin" size={11} />
                    고정
                  </span>
                )}
                {isStartPoint && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                    <Icon name="compass-outline" size={11} />
                    출발
                  </span>
                )}
                {/* addedByAi/addedForRest는 동시에 true가 되지 않는다(서버 계약). */}
                {item.addedByAi &&
                  (onDismissAiSuggestion ? (
                    <button
                      type="button"
                      onClick={onDismissAiSuggestion}
                      aria-label="AI 추천 삭제"
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 transition-colors hover:bg-violet-100"
                    >
                      <Icon name="wand" size={11} />
                      AI 추천
                      <Icon name="close" size={10} />
                    </button>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                      <Icon name="wand" size={11} />
                      AI 추천
                    </span>
                  ))}
                {item.addedForRest && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium text-teal-700">
                    <Icon name="clock" size={11} />
                    휴식
                  </span>
                )}
              </div>
              {(stayLabel || inclineLabel) && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {stayLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 text-[11.5px] font-semibold text-foreground/70">
                      <Icon name="clock" size={11} className="shrink-0" />
                      머무는 시간 {stayLabel}
                    </span>
                  )}
                  {inclineLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11.5px] font-semibold text-orange-700">
                      <Icon name="trending-up" size={11} className="shrink-0" />
                      {inclineLabel}
                    </span>
                  )}
                </div>
              )}
            </div>

            {editable && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={isFirst}
                  onClick={onMoveUp}
                  aria-label="위로 이동"
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                >
                  <Icon name="chevron-up" size={16} />
                </button>
                <button
                  type="button"
                  disabled={isLast}
                  onClick={onMoveDown}
                  aria-label="아래로 이동"
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                >
                  <Icon name="chevron-down" size={16} />
                </button>
                <button
                  type="button"
                  onClick={onTogglePinned}
                  aria-label={item.pinned ? "고정됨" : "고정"}
                  aria-pressed={item.pinned}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-[9px] border transition-colors",
                    item.pinned
                      ? "border-primary/40 bg-accent text-accent-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon name="pin" size={14} />
                </button>
                <button
                  type="button"
                  onClick={onOpenReplacePicker}
                  aria-label="대체 장소"
                  className="rounded-[9px] border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  대체
                </button>
                <button
                  type="button"
                  aria-label={confirmingRemove ? "정말 삭제?" : "삭제"}
                  onClick={() => {
                    if (confirmingRemove) {
                      onRemove?.();
                      setConfirmingRemove(false);
                    } else {
                      setConfirmingRemove(true);
                    }
                  }}
                  className={cn(
                    "flex h-8 items-center justify-center gap-1 rounded-[9px] border text-xs font-semibold transition-colors",
                    confirmingRemove
                      ? "border-destructive/40 bg-destructive/10 px-2.5 text-destructive"
                      : "w-8 border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive",
                  )}
                >
                  <Icon name="close" size={16} />
                  {confirmingRemove && <span>삭제</span>}
                </button>
              </div>
            )}
          </div>

          {item.reason && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
              <Icon
                name="wand"
                size={13}
                className="mt-0.5 shrink-0 text-primary"
              />
              <span>{item.reason}</span>
            </p>
          )}

          {notes.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {notes.map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"
                >
                  <Icon
                    name="alert"
                    size={13}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
