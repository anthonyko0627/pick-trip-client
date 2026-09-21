"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useBasket } from "@/hooks/useBasket";
import { formatDuration } from "@/lib/itinerary";
import {
  defaultTripStartDate,
  TRIP_COURSES,
  type TripCourse,
} from "@/lib/tripCourses";
import type { BasketItem } from "@/types/basket";
import { REGION_LABELS } from "@/types/region";

// 코스의 장소들을 여행 바구니 항목으로 바꾼다. 요약 화면(PreGenerateView)은
// { id, name, region, category } 만 있으면 렌더되고(이미지·주소는 폴백),
// 실제 일정 생성은 contentId로 백엔드 바구니를 다시 읽으므로 여기 값은
// 요약 화면 표시용이다. 전 항목 "MUST" → 요약 화면에서 "꼭 가기"로 묶인다.
function courseToBasketItems(course: TripCourse): BasketItem[] {
  const addedAt = Date.now();
  return course.spots.map(
    (spot): BasketItem => ({
      content: {
        id: spot.id,
        name: spot.name,
        region: course.region,
        category: spot.category,
        imageUrl: null,
        address: "",
      },
      addedAt,
      priority: "MUST",
      desiredStayMinutes: null,
    }),
  );
}

// /itinerary 요약 화면은 콘텐츠를 localStorage 바구니에서, 조건은 URL 쿼리에서
// 읽는다. 출발일은 기본값을 넣어두고 사용자가 "조건 수정"에서 바꾸게 한다.
function itineraryHref(course: TripCourse): string {
  const params = new URLSearchParams({
    regions: course.region,
    startDate: defaultTripStartDate(),
    nights: String(course.nights),
  });
  if (course.companions.length > 0) {
    params.set("companions", course.companions.join(","));
  }
  return `/itinerary?${params.toString()}`;
}

const META_BADGE_CLASS =
  "rounded-full bg-[oklch(0.968_0.012_30)] px-3 py-1.5 text-xs font-bold text-muted-foreground";

// CollectionsSection(서버 셸) 안쪽의 상호작용 리스트. 행을 누르면 코스 장소를
// 바구니에 담고 요약 화면으로 이동한다. 바구니에 이미 담긴 게 있으면 먼저
// 그 행을 인라인 확인 상태로 바꾼다.
export function TripCourseList() {
  const router = useRouter();
  const { items, save } = useBasket();
  const [confirmingSlug, setConfirmingSlug] = useState<string | null>(null);

  function goToCourse(course: TripCourse) {
    setConfirmingSlug(null);
    save(courseToBasketItems(course));
    router.push(itineraryHref(course));
  }

  function handleSelect(course: TripCourse) {
    // 확인 패널이 이미 열려 있는 행이면 재클릭은 아무 효과가 없다 — 진행은
    // "계속" 버튼으로만, 닫기는 "취소" 버튼으로만 한다. 이 가드가 없으면
    // 패널이 뜬 상태에서 같은 행을 다시 누를 때 확인 없이 곧장 바구니가
    // 교체돼 버렸다.
    if (confirmingSlug === course.slug) return;
    if (items.length > 0) {
      setConfirmingSlug(course.slug);
      return;
    }
    goToCourse(course);
  }

  return (
    <ul className="mt-6 border-t border-[oklch(0.92_0.012_30)]">
      {TRIP_COURSES.map((course, index) => (
        <li
          key={course.slug}
          className="border-b border-[oklch(0.94_0.012_30)]"
        >
          <button
            type="button"
            onClick={() => handleSelect(course)}
            className="grid w-full grid-cols-[52px_1fr_auto] items-center gap-4 px-2 py-[26px] text-left transition-colors hover:bg-[oklch(0.985_0.012_30)] sm:grid-cols-[76px_1fr_auto] sm:gap-6"
          >
            <span className="text-[30px] font-extrabold tracking-tight text-[oklch(0.68_0.11_30)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight sm:text-[22px]">
                {course.title}
              </span>
              <span className="mt-1.5 block text-[13.5px] text-muted-foreground">
                {course.desc}
              </span>
            </span>
            <span className="flex items-center gap-2 sm:gap-3">
              <span className={META_BADGE_CLASS}>
                {REGION_LABELS[course.region]}
              </span>
              <span className={`hidden sm:inline ${META_BADGE_CLASS}`}>
                {formatDuration(course.nights)}
              </span>
              <span className={META_BADGE_CLASS}>{course.spots.length}곳</span>
              <span
                aria-hidden="true"
                className="text-lg font-bold text-primary"
              >
                →
              </span>
            </span>
          </button>

          {confirmingSlug === course.slug && (
            <div className="flex flex-wrap items-center gap-3 bg-[oklch(0.985_0.012_30)] px-2 pb-5 sm:px-4">
              <p className="text-[13px] text-muted-foreground">
                현재 담은 {items.length}개를 이 코스로 바꿉니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToCourse(course)}
                  className="rounded-lg bg-primary px-3.5 py-2 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  계속
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingSlug(null)}
                  className="rounded-lg border border-border bg-white px-3.5 py-2 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-[oklch(0.98_0.012_30)]"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
