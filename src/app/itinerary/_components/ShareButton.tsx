"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { parseApiError } from "@/lib/errors";
import { createShare } from "@/services/shareService";

interface ShareButtonProps {
  itineraryId: string;
}

type ShareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "created"; shareUrl: string }
  | { status: "error"; message: string };

export function ShareButton({ itineraryId }: ShareButtonProps) {
  const [state, setState] = useState<ShareState>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    return () => clearTimeout(copiedTimeoutRef.current);
  }, []);

  async function handleShare() {
    setState({ status: "loading" });
    try {
      const { shareUrl } = await createShare(itineraryId);
      setState({ status: "created", shareUrl });
    } catch (err) {
      setState({ status: "error", message: parseApiError(err).message });
    }
  }

  async function handleCopy(shareUrl: string) {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  if (state.status === "created") {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={state.shareUrl}
          aria-label="공유 링크"
          className="min-w-0 flex-1 rounded border border-border px-2 py-1 text-sm text-foreground"
        />
        <Button
          type="button"
          variant={copied ? "secondary" : "outline"}
          size="sm"
          onClick={() => handleCopy(state.shareUrl)}
          className={copied ? "text-teal-700" : undefined}
        >
          {copied ? "복사됨" : "복사"}
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm text-destructive">{state.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleShare}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={state.status === "loading"}
      onClick={handleShare}
    >
      {state.status === "loading" ? "생성 중..." : "공유하기"}
    </Button>
  );
}
