"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useBasket } from "@/hooks/useBasket";
import {
  CATEGORY_BADGE_CLASSES,
  CATEGORY_LABELS,
  type ContentDetail,
} from "@/types/content";

interface ContentDetailViewProps {
  content: ContentDetail;
}

interface InfoRowProps {
  label: string;
  value: string | null;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={value ? "text-foreground" : "text-muted-foreground"}>
        {value ?? "정보 없음"}
      </span>
    </div>
  );
}

export function ContentDetailView({ content }: ContentDetailViewProps) {
  const router = useRouter();
  const { add, remove, isInBasket } = useBasket();
  const inBasket = isInBasket(content.id);

  const allImages = [
    ...(content.imageUrl ? [content.imageUrl] : []),
    ...content.imageUrls,
  ];

  const parkingText =
    content.parking === null ? null : content.parking ? "가능" : "불가능";

  const reservationText =
    content.reservationRequired === null
      ? null
      : content.reservationRequired
        ? "필요"
        : "불필요";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-4 text-sm text-muted-foreground hover:text-foreground"
      >
        ← 목록으로
      </button>

      {allImages.length > 0 ? (
        <div className="relative mb-6 aspect-video overflow-hidden rounded-xl bg-muted">
          <Image
            src={allImages[0]}
            alt={content.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        </div>
      ) : (
        <div className="mb-6 flex aspect-video items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
          이미지 없음
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <h1 className="text-xl font-semibold leading-tight">{content.name}</h1>
        {content.category && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_BADGE_CLASSES[content.category]}`}
          >
            {CATEGORY_LABELS[content.category]}
          </span>
        )}
      </div>

      <p className="mb-1 text-sm text-muted-foreground">{content.address}</p>
      <p className="mb-6 text-sm text-foreground/80">{content.summary}</p>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border p-4">
        <InfoRow label="운영시간" value={content.operatingHours} />
        <InfoRow label="휴무일" value={content.closedDay} />
        <InfoRow label="주차" value={parkingText} />
        <InfoRow label="예상 체류 시간" value={content.stayDuration} />
        <InfoRow label="예약" value={reservationText} />
        {content.dataSource && (
          <InfoRow label="데이터 출처" value={content.dataSource} />
        )}
      </div>

      <Button
        variant={inBasket ? "default" : "outline"}
        className="w-full"
        onClick={() => (inBasket ? remove(content.id) : add(content))}
      >
        <Icon name={inBasket ? "check" : "plus"} size={16} />
        {inBasket ? "담김" : "담기"}
      </Button>
    </div>
  );
}
