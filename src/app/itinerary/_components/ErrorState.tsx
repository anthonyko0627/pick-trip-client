"use client";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  traceId?: string;
  onRetry: () => void;
}

export function ErrorState({ message, traceId, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="font-medium text-red-600">{message}</p>
      {traceId && (
        <p className="text-xs text-gray-400">문의 시 참고: {traceId}</p>
      )}
      <Button variant="outline" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
