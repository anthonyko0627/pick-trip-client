"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { useBasket } from "@/hooks/useBasket";
import { formatDuration } from "@/lib/itinerary";
import { JOURNEY_STEPS } from "@/lib/journey";
import { cn } from "@/lib/utils";
import type { BasketItem, BasketPriority } from "@/types/basket";
import { STAY_MINUTES_OPTIONS } from "@/types/basket";
import { CATEGORY_LABELS } from "@/types/content";
import {
  ALL_TRAVEL_MODES,
  type ItineraryGenerateMode,
  type ItineraryGenerateRequest,
} from "@/types/itinerary";
import { REGION_LABELS, type Region } from "@/types/region";
import {
  COMPANION_CONDITION_LABELS,
  type CompanionCondition,
} from "@/types/travel-condition";

import { ErrorState } from "./ErrorState";

interface PreGenerateViewProps {
  // /itinerary 쿼리 파라미터 원본 문자열 (ItineraryClient가 받은 그대로).
  regions: string;
  startDate: string;
  nights: string;
  companions: string;
  // 옵션을 하나도 안 바꿨으면 undefined — 기존과 완전히 같은 요청(자동차
  // 단일안)을 보낸다.
  onGenerate: (options?: ItineraryGenerateRequest) => void;
  error?: { message: string; traceId?: string } | null;
}

const MISSING = "미선택";

const MODE_OPTIONS: {
  value: ItineraryGenerateMode;
  label: string;
  desc: string;
}[] = [
  {
    value: "STRICT",
    label: "담은 콘텐츠만",
    desc: "바구니에 담은 장소만으로 일정을 만듭니다",
  },
  {
    value: "AUGMENT",
    label: "AI 추천 장소도 추가",
    desc: "같은 지역의 다른 콘텐츠를 AI가 더 제안할 수 있어요",
  },
];

const DEFAULT_MODE: ItineraryGenerateMode = "STRICT";

// mode/startContentId는 기본값과 다를 때만 싣지만, travelModes는 항상 전체를
// 싣는다 — 그래야 결과 화면에 안 선택 카드가 항상 뜬다.
function buildGenerateOptions(
  mode: ItineraryGenerateMode,
  startContentId: string,
): ItineraryGenerateRequest {
  const options: ItineraryGenerateRequest = { travelModes: ALL_TRAVEL_MODES };
  if (mode !== DEFAULT_MODE) options.mode = mode;
  if (startContentId) options.startContentId = startContentId;
  return options;
}

// 스펙 §8: 쿼리가 비었을 때 `NaN월 NaN일`이 나오던 문제를 막는다.
function formatStartDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${weekday})`;
}

const PRIORITY_GROUPS: {
  key: BasketPriority;
  badge: string;
  desc: string;
  badgeClass: string;
}[] = [
  {
    key: "MUST",
    badge: "꼭 가기",
    desc: "일정에 반드시 포함합니다",
    badgeClass: "bg-primary text-primary-foreground",
  },
  {
    key: "SHOULD",
    badge: "가면 좋음",
    desc: "여유가 있으면 넣습니다",
    badgeClass: "bg-[oklch(0.955_0.04_30)] text-[oklch(0.52_0.19_28)]",
  },
  {
    key: "OPTIONAL",
    badge: "선택",
    desc: "동선이 맞을 때만 넣습니다",
    badgeClass: "bg-[oklch(0.965_0.008_30)] text-[oklch(0.5_0.015_30)]",
  },
];

// 우선순위 미지정(null)은 가장 느슨한 OPTIONAL 그룹으로 묶는다.
function groupKey(priority: BasketPriority | null): BasketPriority {
  return priority ?? "OPTIONAL";
}

const AI_CONSIDERATIONS: { icon: IconName; title: string; desc: string }[] = [
  {
    icon: "compass-outline",
    title: "이동 거리",
    desc: "가까운 곳끼리 묶어 하루 동선을 짧게 만듭니다",
  },
  {
    icon: "calendar",
    title: "운영 시간",
    desc: "문 여는 시간에 맞춰 방문 순서를 정합니다",
  },
  {
    icon: "restaurant-outline",
    title: "식사 시간",
    desc: "점심·저녁에 음식 콘텐츠를 배치합니다",
  },
];

const POST_GENERATE_NOTES = [
  "장소 순서를 위·아래로 옮길 수 있습니다",
  "마음에 안 드는 장소는 지우거나 다른 곳으로 바꿉니다",
  "꼭 넣고 싶은 장소는 고정해두면 다시 생성해도 남습니다",
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-[18px] w-1 rounded-full bg-primary" />
      {children}
    </div>
  );
}

export function PreGenerateView({
  regions,
  startDate,
  nights,
  companions,
  onGenerate,
  error,
}: PreGenerateViewProps) {
  const { items, remove, setStayMinutes } = useBasket();

  // 일정 생성 옵션. mode/startContentId는 서버 기본값과 동일하게 시작한다.
  // 이동수단은 사용자가 고르지 않고 항상 전체를 요청한다(ALL_TRAVEL_MODES).
  const [mode, setMode] = useState<ItineraryGenerateMode>(DEFAULT_MODE);
  const [startContentId, setStartContentId] = useState("");
  // 고른 시작 장소가 바구니에서 지워지면 select state는 그대로 남는다
  // (버그였다). 매 렌더 바구니와 대조해 사라진 값은 없는 셈 치고
  // "AI가 자동으로 정함"으로 되돌린다 — 별도 effect 없이 파생값으로 처리한다.
  const validStartContentId = items.some(
    (item) => item.content.id === startContentId,
  )
    ? startContentId
    : "";

  function handleGenerateClick() {
    onGenerate(buildGenerateOptions(mode, validStartContentId));
  }

  const parsedRegions = regions.split(",").filter(Boolean) as Region[];
  const parsedNights = Number(nights) || 0;
  const parsedCompanions = companions
    .split(",")
    .filter(Boolean) as CompanionCondition[];

  const regionLabel = parsedRegions.length
    ? parsedRegions.map((r) => REGION_LABELS[r] ?? r).join(", ")
    : null;
  const dateLabel = formatStartDate(startDate);
  const durationLabel =
    startDate || parsedNights ? formatDuration(parsedNights) : null;
  const companionLabel = parsedCompanions.length
    ? parsedCompanions.map((c) => COMPANION_CONDITION_LABELS[c]).join(", ")
    : "없음";

  const dayCount = parsedNights + 1;
  const perDay = Math.max(1, Math.round(items.length / dayCount));
  const canGenerate =
    regionLabel !== null && dateLabel !== null && items.length >= 2;

  const query = new URLSearchParams();
  if (regions) query.set("regions", regions);
  if (startDate) query.set("startDate", startDate);
  query.set("nights", nights || "0");
  if (companions) query.set("companions", companions);
  const qs = query.toString();
  const conditionsHref = `/select/conditions?${qs}`;
  const contentsHref = `/contents?${qs}`;

  const groups = PRIORITY_GROUPS.map((group) => ({
    ...group,
    entries: items.filter((i) => groupKey(i.priority) === group.key),
  })).filter((group) => group.entries.length > 0);

  type Row = { icon: IconName; label: string; value: string | null };

  // §2 여행 조건 카드(좌): 4칸
  const conditionRows: Row[] = [
    { icon: "map-outline", label: "지역", value: regionLabel },
    { icon: "calendar", label: "출발일", value: dateLabel },
    { icon: "moon", label: "기간", value: durationLabel },
    { icon: "user", label: "동행 조건", value: companionLabel },
  ];

  // §5 여행 요약 카드(우): 5행 (담은 콘텐츠 개수 포함)
  const summaryRows: Row[] = [
    { icon: "map-outline", label: "지역", value: regionLabel },
    { icon: "calendar", label: "날짜", value: dateLabel },
    { icon: "moon", label: "기간", value: durationLabel },
    { icon: "user", label: "동행", value: companionLabel },
    { icon: "bookmark", label: "담은 콘텐츠", value: `${items.length}개` },
  ];

  return (
    <div className="w-full pb-16">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href={conditionsHref} className="hover:text-primary">
          {JOURNEY_STEPS[0].label}
        </Link>
        <span aria-hidden="true">›</span>
        <Link href={contentsHref} className="hover:text-primary">
          {JOURNEY_STEPS[1].label}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-foreground">
          {JOURNEY_STEPS[2].label}
        </span>
      </nav>

      {error && (
        <div className="mt-4">
          <ErrorState
            message={error.message}
            traceId={error.traceId}
            onRetry={handleGenerateClick}
          />
        </div>
      )}

      {/* 1. 히어로 */}
      <section className="mt-5 flex flex-col gap-6 rounded-[26px] bg-gradient-to-br from-[oklch(0.63_0.2_30)] to-[oklch(0.53_0.2_16)] px-[38px] py-[34px] text-white lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.12em] uppercase">
            Step {JOURNEY_STEPS[2].n} · {JOURNEY_STEPS[2].label}
          </span>
          <h1 className="mt-3.5 text-[36px] leading-[1.22] font-extrabold tracking-[-0.045em]">
            담은 콘텐츠로
            <br />
            일정을 만들어볼까요?
          </h1>
          <p className="mt-3 max-w-[430px] text-[14.5px] leading-[1.65] break-keep text-white/85">
            아래 조건과 콘텐츠를 확인한 뒤 생성하세요. 이동 거리와 운영 시간을
            고려해 순서를 배치합니다.
          </p>
        </div>

        <dl className="grid w-full shrink-0 grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/16 lg:w-[360px]">
          {[
            { value: items.length, unit: "개", label: "담은 콘텐츠" },
            { value: dayCount, unit: "일", label: "여행 기간" },
            { value: perDay, unit: "곳", label: "하루 평균" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 bg-white/10 px-3.5 py-4"
            >
              <dt className="text-[11px] font-bold text-white/75">
                {stat.label}
              </dt>
              <dd className="flex items-baseline gap-0.5">
                <span className="text-[23px] font-extrabold tracking-[-0.03em]">
                  {stat.value}
                </span>
                <span className="text-[11.5px] font-semibold text-white/80">
                  {stat.unit}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 2열 그리드 */}
      <div className="mt-6 grid grid-cols-1 items-start gap-[22px] lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          {/* 2. 여행 조건 */}
          <section className="rounded-[22px] border border-border bg-white p-6">
            <div className="flex items-center justify-between">
              <SectionHeading>
                <h2 className="text-[18px] font-bold tracking-[-0.03em]">
                  여행 조건
                </h2>
              </SectionHeading>
              <Link
                href={conditionsHref}
                className="text-[12.5px] font-bold text-primary hover:underline"
              >
                조건 수정 →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {conditionRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 rounded-[15px] border border-[oklch(0.94_0.012_30)] px-4 py-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.965_0.03_30)] text-[oklch(0.55_0.16_28)]">
                    <Icon name={row.icon} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-[oklch(0.6_0.015_30)]">
                      {row.label}
                    </p>
                    <p
                      className={`truncate text-[14.5px] font-bold tracking-[-0.02em] ${
                        row.value === null ? "text-[oklch(0.68_0.015_30)]" : ""
                      }`}
                    >
                      {row.value ?? MISSING}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2.5 일정 만들기 옵션 */}
          <section className="rounded-[22px] border border-border bg-white p-6">
            <SectionHeading>
              <h2 className="text-[18px] font-bold tracking-[-0.03em]">
                일정 만들기 옵션
              </h2>
            </SectionHeading>

            <div className="mt-4">
              <span className="text-[13px] font-bold text-foreground">
                구성 방식
              </span>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {MODE_OPTIONS.map((option) => {
                  const selected = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMode(option.value)}
                      className={cn(
                        "rounded-[13px] border-[1.5px] px-3.5 py-3 text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <p className="text-[13.5px] font-bold">{option.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {option.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {items.length > 0 && (
              <div className="mt-4">
                <label
                  htmlFor="start-content-id"
                  className="text-[13px] font-bold text-foreground"
                >
                  시작 장소
                </label>
                <select
                  id="start-content-id"
                  value={validStartContentId}
                  onChange={(e) => setStartContentId(e.target.value)}
                  className="mt-2 w-full rounded-[13px] border-[1.5px] border-border bg-card px-3.5 py-3 text-[13.5px] font-semibold"
                >
                  <option value="">AI가 자동으로 정함</option>
                  {items.map((item) => (
                    <option key={item.content.id} value={item.content.id}>
                      {item.content.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* 3. 담은 콘텐츠 */}
          <section className="rounded-[22px] border border-border bg-white p-6">
            <div className="flex items-center justify-between">
              <SectionHeading>
                <h2 className="text-[18px] font-bold tracking-[-0.03em]">
                  담은 콘텐츠
                </h2>
                <span className="rounded-full bg-[oklch(0.955_0.04_30)] px-2 py-0.5 text-[11.5px] font-extrabold text-[oklch(0.52_0.19_28)]">
                  {items.length}
                </span>
              </SectionHeading>
              <Link
                href={contentsHref}
                className="text-[12.5px] font-bold text-primary hover:underline"
              >
                콘텐츠 더 담기 →
              </Link>
            </div>

            {items.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-[16px] border-[1.5px] border-dashed border-[oklch(0.88_0.055_30)] bg-[oklch(0.99_0.012_30)] py-10 text-center">
                <p className="text-[13.5px] font-bold text-foreground/80">
                  담은 콘텐츠가 없습니다
                </p>
                <Link
                  href={contentsHref}
                  className="rounded-xl bg-primary px-4.5 py-2.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  콘텐츠 둘러보기 →
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {groups.map((group) => (
                  <div key={group.key}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${group.badgeClass}`}
                      >
                        {group.badge}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground">
                        {group.desc}
                      </span>
                    </div>
                    <ul className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {group.entries.map((entry) => (
                        <BasketRow
                          key={entry.content.id}
                          entry={entry}
                          onRemove={() => remove(entry.content.id)}
                          onSetStayMinutes={(minutes) =>
                            setStayMinutes(entry.content.id, minutes)
                          }
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 4. AI가 고려하는 것 */}
          <section className="rounded-[22px] border border-[oklch(0.94_0.012_30)] bg-[oklch(0.985_0.012_30)] px-6 pt-5.5 pb-6">
            <SectionHeading>
              <h2 className="text-[16px] font-bold tracking-[-0.02em]">
                AI가 고려하는 것
              </h2>
            </SectionHeading>
            <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {AI_CONSIDERATIONS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[14px] bg-white px-4.5 py-4"
                >
                  <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] bg-[oklch(0.965_0.03_30)] text-[oklch(0.55_0.16_28)]">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <p className="mt-2 text-[13.5px] font-bold">{item.title}</p>
                  <p className="mt-1 text-[12px] leading-[1.5] break-keep text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 우측 sticky 컬럼 */}
        <div className="flex flex-col gap-3.5 lg:sticky lg:top-[86px]">
          {/* 5. 여행 요약 */}
          <section className="rounded-[22px] border border-border bg-white p-5.5">
            <SectionHeading>
              <h2 className="text-[17px] font-bold tracking-[-0.03em]">
                여행 요약
              </h2>
            </SectionHeading>
            <dl className="mt-3">
              {summaryRows.map((row, index) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    index < summaryRows.length - 1
                      ? "border-b border-[oklch(0.97_0.006_30)]"
                      : ""
                  }`}
                >
                  <dt className="flex items-center gap-2">
                    <span className="flex h-[25px] w-[25px] items-center justify-center rounded-[9px] bg-[oklch(0.97_0.015_30)] text-[oklch(0.55_0.1_30)]">
                      <Icon name={row.icon} size={14} />
                    </span>
                    <span className="text-[12.5px] text-[oklch(0.55_0.015_30)]">
                      {row.label}
                    </span>
                  </dt>
                  <dd
                    className={`text-right text-[13px] font-bold ${
                      row.value === null ? "text-[oklch(0.68_0.015_30)]" : ""
                    }`}
                  >
                    {row.value ?? MISSING}
                  </dd>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[oklch(0.975_0.012_30)] px-3.5 py-2.5">
                <dt className="text-[12.5px] text-[oklch(0.55_0.015_30)]">
                  예상 일정 규모
                </dt>
                <dd className="text-[13px] font-bold">
                  {dayCount}일 · 약 {items.length}곳
                </dd>
              </div>
            </dl>
          </section>

          {/* 6. 생성 CTA */}
          <section className="rounded-[22px] bg-gradient-to-br from-[oklch(0.63_0.2_30)] to-[oklch(0.53_0.2_16)] p-5.5 text-white">
            <p className="text-[17px] font-bold tracking-[-0.02em]">
              {canGenerate ? "생성 준비 완료" : "조건을 조금만 더"}
            </p>
            <p className="mt-1 text-[12.5px] break-keep text-white/85">
              {canGenerate
                ? "조건과 콘텐츠가 모두 준비됐습니다. 생성까지 약 30초 걸립니다."
                : "지역·출발일을 정하고 콘텐츠를 2개 이상 담아주세요."}
            </p>
            <button
              type="button"
              disabled={!canGenerate}
              onClick={handleGenerateClick}
              className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[13px] px-4 py-3.5 text-[15px] font-bold transition-transform enabled:cursor-pointer enabled:bg-white enabled:text-[oklch(0.52_0.19_28)] enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/70"
            >
              <Icon name="wand" size={16} />
              일정 생성하기
            </button>
            <p className="mt-2 text-center text-[11.5px] text-white/75">
              {canGenerate
                ? "생성 후에도 순서를 바꿀 수 있어요"
                : "조건이 모두 채워지면 활성화됩니다"}
            </p>
          </section>

          {/* 7. 생성 후 안내 */}
          <section className="rounded-[22px] border border-border bg-[oklch(0.99_0.006_30)] px-5 py-4.5">
            <p className="text-[13px] font-bold">생성 후에도 바꿀 수 있어요</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {POST_GENERATE_NOTES.map((note) => (
                <li
                  key={note}
                  className="flex gap-1.5 text-[12px] leading-[1.5] break-keep text-[oklch(0.52_0.015_30)]"
                >
                  <span className="text-primary">·</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function BasketRow({
  entry,
  onRemove,
  onSetStayMinutes,
}: {
  entry: BasketItem;
  onRemove: () => void;
  onSetStayMinutes: (minutes: number | null) => void;
}) {
  const { content } = entry;
  const meta = [
    content.category ? CATEGORY_LABELS[content.category] : null,
    REGION_LABELS[content.region] ?? content.region,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-col gap-2 rounded-[12px] border border-[oklch(0.95_0.008_30)] bg-white p-2">
      <div className="flex items-center gap-2.5">
        <span
          className="h-[42px] w-[42px] shrink-0 rounded-[12px] bg-cover bg-center"
          style={
            content.imageUrl
              ? { backgroundImage: `url(${content.imageUrl})` }
              : {
                  backgroundImage:
                    "repeating-linear-gradient(45deg, oklch(0.93 0.028 30) 0 7px, oklch(0.965 0.014 30) 7px 14px)",
                }
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold">{content.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{meta}</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${content.name} 삭제`}
          className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      <select
        aria-label={`${content.name} 체류 시간`}
        value={entry.desiredStayMinutes ?? ""}
        onChange={(e) =>
          onSetStayMinutes(e.target.value ? Number(e.target.value) : null)
        }
        className="w-full rounded-lg border border-[oklch(0.92_0.01_30)] bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground"
      >
        {STAY_MINUTES_OPTIONS.map((option) => (
          <option key={option.label} value={option.value ?? ""}>
            {option.label}
          </option>
        ))}
      </select>
    </li>
  );
}
