"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ParsedApiError } from "@/lib/errors";
import type { Content } from "@/types/content";
import type { Day } from "@/types/itinerary";
import type { Region } from "@/types/region";
import { AlternativePlacePicker } from "./AlternativePlacePicker";
import { DayCard } from "./DayCard";

interface ItineraryEditor {
  region: Region;
  travelDate: string;
  duration: number;
  days: Day[];
  isDirty: boolean;
  isSaving: boolean;
  saveError: ParsedApiError | null;
  onMoveItem: (dayId: string, itemId: string, direction: "up" | "down") => void;
  onRemoveItem: (dayId: string, itemId: string) => void;
  onTogglePinned: (dayId: string, itemId: string) => void;
  onReplaceItem: (dayId: string, itemId: string, replacement: Content) => void;
  onSave: () => void;
}

interface ItineraryResultProps {
  data: { days: Day[] };
  editor?: ItineraryEditor;
}

export function ItineraryResult({ data, editor }: ItineraryResultProps) {
  const [replaceTarget, setReplaceTarget] = useState<{
    dayId: string;
    itemId: string;
  } | null>(null);

  const days = editor ? editor.days : data.days;

  return (
    <section>
      <h2 className="text-lg font-bold">생성된 일정</h2>
      {days.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">생성된 일정이 없습니다</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {days.map((day) => (
            <DayCard
              key={day.dayId}
              day={day}
              onMoveItem={editor?.onMoveItem}
              onRemoveItem={editor?.onRemoveItem}
              onTogglePinned={editor?.onTogglePinned}
              onOpenReplacePicker={
                editor
                  ? (dayId, itemId) => setReplaceTarget({ dayId, itemId })
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {editor && (
        <div className="mt-4 space-y-2">
          {editor.saveError && (
            <p className="text-sm text-red-600">
              {editor.saveError.message}
              {editor.saveError.traceId &&
                ` (참고: ${editor.saveError.traceId})`}
            </p>
          )}
          <Button
            disabled={!editor.isDirty || editor.isSaving}
            onClick={editor.onSave}
          >
            {editor.isSaving ? "저장 중..." : "변경사항 저장"}
          </Button>
        </div>
      )}

      {editor && replaceTarget && (
        <AlternativePlacePicker
          region={editor.region}
          travelDate={editor.travelDate}
          duration={editor.duration}
          onSelect={(content) => {
            editor.onReplaceItem(
              replaceTarget.dayId,
              replaceTarget.itemId,
              content,
            );
            setReplaceTarget(null);
          }}
          onClose={() => setReplaceTarget(null)}
        />
      )}
    </section>
  );
}
