"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { useBasket } from "@/hooks/useBasket";
import { useFavoriteHeart } from "@/hooks/useFavoriteHeart";
import { useRecentViews } from "@/hooks/useRecentViews";
import { splitBrLines } from "@/lib/content";
import { isValidKoreaCoord } from "@/lib/geo";
import type { ContentDetail } from "@/types/content";
import { REGION_LABELS } from "@/types/region";

import { ContentGallery } from "./ContentGallery";
import { ContentMap } from "./ContentMap";
import { NearbyContents } from "./NearbyContents";

interface ContentDetailViewProps {
  content: ContentDetail;
  showBasketAction?: boolean;
  backHref?: string;
  // 상세 진입 경로(?from=). 근처 콘텐츠 카드 링크에 그대로 이어 붙인다.
  fromParam?: string;
}

interface InfoRowProps {
  label: string;
  value: string | null;
}

// 핸드오프 스펙(12번 "콘텐츠 상세")의 2열 스펙 행. 값이 없는 필드는
// 숨기지 않고 "정보 없음"으로 표시한다(기존 동작 유지). 운영시간·휴무일 원문에
// <br> 태그가 섞여 오면 실제 줄바꿈으로 나눠 여러 줄로 보여준다.
function InfoRow({ label, value }: InfoRowProps) {
  const lines = value ? splitBrLines(value) : [];

  return (
    <div className="flex items-start justify-between gap-4 rounded-[13px] bg-[oklch(0.975_0.01_30)] px-[17px] py-[15px]">
      <span className="shrink-0 text-[12.5px] text-muted-foreground">
        {label}
      </span>
      <span
        className={`min-w-0 text-right text-[13px] font-bold ${
          lines.length > 0 ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {lines.length === 0
          ? "정보 없음"
          : lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
      </span>
    </div>
  );
}

export function ContentDetailView({
  content,
  showBasketAction = true,
  backHref,
  fromParam,
}: ContentDetailViewProps) {
  const router = useRouter();
  const { items, add, remove } = useBasket();
  const {
    active: favorited,
    toggle: toggleFavorite,
    pending: favoritePending,
  } = useFavoriteHeart(content);
  const { addView } = useRecentViews();
  const inBasket = items.some((i) => i.content.id === content.id);
  const [addressCopied, setAddressCopied] = useState(false);

  // "목록으로"는 항상 직전 화면으로 되돌린다(router.back). 목록에서 카테고리·
  // 검색어로 걸러 보던 사용자가 그 상태 그대로 돌아오도록. 새 탭·공유 링크처럼
  // 앱 내 히스토리가 없을 때만 목록 경로(backHref, 기본 /contents)로 이동한다.
  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(backHref ?? "/contents");
    }
  }

  // 콘텐츠 상세 진입 시(/contents, /explore 어느 경로든) 최근 본 콘텐츠로 기록한다.
  useEffect(() => {
    addView(content);
  }, [content, addView]);

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(content.address);
      setAddressCopied(true);
      // 토스트 도입 전 임시 — 버튼 라벨을 2초간 "복사됨"으로.
      setTimeout(() => setAddressCopied(false), 2000);
    } catch {
      // 클립보드 접근이 막혀 있으면 조용히 무시한다.
    }
  }

  function handleKakaoDirections() {
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(
      content.name,
    )},${content.latitude},${content.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const allImages = [
    ...(content.imageUrl ? [content.imageUrl] : []),
    ...content.imageUrls,
  ];

  const hasCoord = isValidKoreaCoord(content.latitude, content.longitude);

  const parkingText =
    content.parking === null ? null : content.parking ? "가능" : "불가능";

  const reservationText =
    content.reservationRequired === null
      ? null
      : content.reservationRequired
        ? "필요"
        : "불필요";

  const rows: InfoRowProps[] = [
    { label: "지역", value: REGION_LABELS[content.region] },
    { label: "운영 시간", value: content.operatingHours },
    { label: "휴무일", value: content.closedDay },
    { label: "주차", value: parkingText },
    { label: "예상 체류 시간", value: content.stayDuration },
    { label: "예약", value: reservationText },
    // 백엔드가 내려주는 원본 값(TourAPI 등)과 무관하게, 실제 데이터 제공처인
    // 한국관광공사로 표시를 통일한다.
    ...(content.dataSource
      ? [{ label: "데이터 출처", value: "한국관광공사" }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground"
      >
        ← 목록으로
      </button>

      <div className="mt-1.5 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-[34px]">
        {/* 왼쪽 열 — 본문 */}
        <div className="min-w-0">
          <ContentGallery
            key={content.id}
            images={allImages}
            name={content.name}
            category={content.category}
          />

          <h1 className="mt-6 text-[34px] font-extrabold tracking-[-0.05em]">
            {content.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {content.address}
          </p>

          {content.summary && (
            <p className="mt-5 text-[15.5px] leading-[1.85] text-foreground/80 [text-wrap:pretty]">
              {content.summary}
            </p>
          )}

          <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {rows.map((row) => (
              <InfoRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>

          {/* 좌표 기반 조회라 원본에 좌표가 있을 때만. 근처에 결과가 없거나
              조회가 실패하면 컴포넌트가 스스로 아무것도 렌더하지 않는다. */}
          {hasCoord && (
            <NearbyContents contentId={content.id} fromParam={fromParam} />
          )}
        </div>

        {/* 오른쪽 열 — 지도 + 액션 패널. items-start 그리드에서 sticky 가
            움직이려면 <aside> 는 self-stretch 로 늘이고 sticky 는 안쪽 래퍼에. */}
        <aside className="self-stretch">
          <div className="flex flex-col gap-3.5 lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-[20px] border border-border">
              {hasCoord ? (
                <ContentMap
                  latitude={content.latitude}
                  longitude={content.longitude}
                  name={content.name}
                />
              ) : (
                <div className="flex h-[250px] items-center justify-center bg-muted px-6 text-center text-[12.5px] text-muted-foreground">
                  이 콘텐츠에는 위치 좌표가 없어요. 주소로 검색해 주세요.
                </div>
              )}

              <div className="flex flex-col gap-3 p-4">
                <p className="text-[13px] text-muted-foreground">
                  {content.address}
                </p>

                <div
                  className={`grid gap-2 ${
                    hasCoord ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-[13px] font-bold text-foreground hover:bg-muted"
                  >
                    {addressCopied ? "복사됨" : "주소 복사"}
                  </button>
                  {hasCoord && (
                    <button
                      type="button"
                      onClick={handleKakaoDirections}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-[13px] font-bold text-foreground hover:bg-muted"
                    >
                      카카오맵 길찾기
                    </button>
                  )}
                </div>

                {showBasketAction && (
                  <>
                    <div className="border-border border-t" />
                    <button
                      type="button"
                      onClick={() =>
                        inBasket ? remove(content.id) : add(content)
                      }
                      className={`inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl text-[15px] font-extrabold transition-colors ${
                        inBasket
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-accent text-accent-foreground hover:bg-accent/80"
                      }`}
                    >
                      <Icon name={inBasket ? "check" : "plus"} size={16} />
                      {inBasket ? "일정에 담김" : "일정에 담기"}
                    </button>
                    <button
                      type="button"
                      aria-label={favorited ? "찜 해제" : "찜하기"}
                      aria-pressed={favorited}
                      onClick={toggleFavorite}
                      disabled={favoritePending}
                      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-muted text-[13px] font-bold hover:bg-muted/70 ${
                        favorited ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      <Icon name="heart" size={16} />
                      {favorited ? "찜함" : "찜하기"}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      담은 콘텐츠는 여행 일정 만들기에서 사용돼요.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
