"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type Content } from "@/types/content";

interface ContentCardProps {
  content: Content;
  isInBasket: boolean;
  onToggleBasket: () => void;
}

export function ContentCard({
  content,
  isInBasket,
  onToggleBasket,
}: ContentCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Link href={`/contents/${content.id}`} className="block">
        <div className="relative aspect-video bg-muted">
          {content.imageUrl ? (
            <Image
              src={content.imageUrl}
              alt={content.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              이미지 없음
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium leading-tight">{content.name}</h3>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {CATEGORY_LABELS[content.category]}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">{content.address}</p>
          <p className="line-clamp-2 text-sm text-foreground/80">
            {content.summary}
          </p>
        </div>
      </Link>

      <div className="p-4 pt-2">
        <Button
          variant={isInBasket ? "default" : "outline"}
          size="sm"
          className="mt-1 w-full"
          onClick={onToggleBasket}
        >
          {isInBasket ? "담김" : "담기"}
        </Button>
      </div>
    </div>
  );
}
