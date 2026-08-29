"use client";

import Link from "next/link";

import { ContentCardActions } from "@/components/ContentCardActions";
import { ContentImage } from "@/components/ContentImage";
import { CATEGORY_LABELS, type Content } from "@/types/content";
import { REGION_LABELS } from "@/types/region";

interface ForYouCardProps {
  content: Content;
}

// ContentCard와 동일한 본문(썸네일 위 코랄 카테고리 배지 + 우상단 반투명 지역
// 배지 / 제목 / 주소 / 요약)에 찜·담기 액션(ContentCardActions)을 붙인 카드.
// 상세 페이지 링크에 ?from=for-you를 붙이는 점만 ContentCard와 다르다.
//
// 링크에 after:absolute after:inset-0(stretched link)를 걸어 카드 박스 어디를
// 눌러도 상세 페이지로 이동한다. 찜·담기 액션 행은 relative z-10으로 오버레이
// 위에 띄워 버튼 클릭이 이동으로 삼켜지지 않도록 한다.
export function ForYouCard({ content }: ForYouCardProps) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[18px] border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg">
      <Link
        href={`/contents/${content.id}?from=for-you`}
        className="block after:absolute after:inset-0 after:content-['']"
      >
        <div className="relative aspect-[4/3] bg-muted">
          <ContentImage
            src={content.imageUrl}
            alt={content.name}
            category={content.category}
            size="lg"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {content.category && (
            <span className="absolute top-2.5 left-2.5 rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-extrabold text-primary-foreground">
              {CATEGORY_LABELS[content.category]}
            </span>
          )}
          <span className="absolute top-2.5 right-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-extrabold text-foreground shadow-sm backdrop-blur-sm">
            {REGION_LABELS[content.region]}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 p-4 pb-2">
          <h3 className="text-[14.5px] font-bold tracking-tight text-foreground">
            {content.name}
          </h3>
          <p className="text-xs text-muted-foreground">{content.address}</p>
          <p className="line-clamp-2 text-sm text-foreground/80">
            {content.summary}
          </p>
        </div>
      </Link>

      <div className="relative z-10 mt-auto p-4 pt-2">
        <ContentCardActions content={content} />
      </div>
    </div>
  );
}
