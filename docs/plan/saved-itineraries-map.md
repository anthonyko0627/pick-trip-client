# 저장한 일정 화면(`/itineraries`) — 펼친 상세 2열 + 지도 패널 리디자인

- 이슈: CMU02/pick-trip-client#123
- 브랜치: `feat/123` (base main)
- 원본 작업 지시서: `task-saved-itineraries-map.md`(사용자 제공, 다운로드 폴더) — 채택안(1a) 시안
  `저장한 일정 페이지.dc.html` 기준. 이 문서는 그 지시서를 현재 코드베이스 컨벤션에 맞게
  보정한 실행판이다.

## 배경 — 무엇이 바뀌는가

지금은 목록에서 `보기`를 누르면 `ItineraryResult`가 **단독(1열)** 으로 펼쳐지고, 지도
(`DayMapPanel`)가 일정 카드 **아래**에 300px 높이로 붙는다. 일정을 보면서 지도를 볼 수
없고 스크롤이 길어진다.

바뀌는 것:

1. 펼친 상세를 **2열**로 만든다 — 왼쪽 `DayCard`(일정 타임라인), 오른쪽 `DayMapPanel`(sticky 지도).
2. 지도 위에 **일차 요약 배지**를 띄운다(1일차 · 4곳 · 56분 · 32.2km).
3. 목록 행(접힌 것 포함) 톤은 유지, 펼친 행에만 헤더 배경·메타 이동거리 강조가 붙는다.

`DayCard`, `PlaceItem`, `DayRouteLegs`, `DayTabs`의 내부 구조·스타일은 **바꾸지 않는다**.
이 작업의 범위는 배치(레이아웃)와 지도 패널 장식이다.

## 원본 지시서 대비 보정 사항

원본 지시서(목업 기준, 1152px)와 사용자 확인을 거쳐 다음 두 가지를 바꿔서 진행한다.

1. **페이지 폭**: `max-w-6xl`(1152px) 대신 `max-w-7xl`(1280px)을 쓴다.
   `Header`(`max-w-7xl`)·AI 일정 결과 화면(`itinerary/page.tsx`도 `max-w-7xl`)과 폭을
   통일하기 위해서다(사용자 지시: "너비는 헤더로 맞춰서").
2. **사이드바(지도 컬럼) 폭**: 목업의 `384px` 대신 기존 컨벤션인 **`380px`**을 쓴다.
   `ItineraryClient.tsx`·`PreGenerateView.tsx`가 이미 `lg:grid-cols-[minmax(0,1fr)_380px]`를
   쓰고 있어(`docs/plan/itinerary-result-polish-v3.md` A절), 같은 값으로 통일한다.
3. **일차별 색상 범례(DayLegend)는 넣지 않는다.** `DayMapPanel`은 항상 "선택한 하루만
   코랄"로 그리는 기존 동작(day 뷰 통일 코랄, `ItineraryMap.tsx`의 `CORAL` 상수 주석 참고)이라,
   범례를 넣으면 2일차를 봐도 지도는 코랄인데 범례는 파란 점이라 불일치한다. 지도 색을
   `dayIndex`별로 바꾸는 대안(원 지시서 A안)은 AI 일정 생성 결과·공유 페이지의 지도 색상까지
   함께 바꾸는 범위 밖 변경이라 **사용자가 반려**했다. → 이번 작업에서 `DayLegend`는
   만들지 않고, 일차 탭 행 오른쪽은 기존처럼 `headerAction`(공유하기 버튼)만 둔다.

## 1. `ItineraryResult` — hideMap일 때 카카오 안내문도 숨김

한 줄 수정:

```diff
- {hasAnyRoute && (
+ {hasAnyRoute && !hideMap && (
```

2열 레이아웃에서는 안내문을 지도 옆(사이드바 하단)에 두므로, `hideMap`일 때 카드 아래
안내문이 중복 렌더되지 않게 한다.

## 2. 신규 `SavedItineraryDetail` — 2열 레이아웃

새 파일 `src/app/itineraries/_components/SavedItineraryDetail.tsx`:

```tsx
"use client";

import { useState } from "react";

import { DayMapPanel } from "@/app/itinerary/_components/DayMapPanel";
import { ItineraryResult } from "@/app/itinerary/_components/ItineraryResult";
import { ShareButton } from "@/app/itinerary/_components/ShareButton";
import { useItineraryMapData } from "@/hooks/useItineraryMapData";
import type { ItineraryResponse } from "@/types/itinerary";
import type { ItineraryMapData } from "@/types/map";

interface Props {
  data: ItineraryResponse;
  mapData?: ItineraryMapData;
  itineraryId: string;
}

export function SavedItineraryDetail({ data, mapData, itineraryId }: Props) {
  const [dayIndex, setDayIndex] = useState(0);
  // 스냅샷이 있으면 라이브 해석을 건너뛴다(ItineraryResult와 같은 규칙).
  const liveMapData = useItineraryMapData(mapData ? [] : data.days);
  const resolved = mapData ?? liveMapData;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <ItineraryResult
          data={data}
          mapData={resolved}
          selectedDayIndex={dayIndex}
          onSelectDay={setDayIndex}
          hideMap
          headerAction={<ShareButton itineraryId={itineraryId} />}
        />
      </div>

      <div className="sticky top-6 flex flex-col gap-2.5">
        <DayMapPanel
          days={data.days}
          mapData={resolved}
          selectedDayIndex={dayIndex}
        />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          이동 시간·거리는 카카오 모빌리티 자동차 길찾기 실제 도로 기준입니다.
          순서를 바꾸면 다시 계산돼요.
        </p>
      </div>
    </div>
  );
}
```

규칙:
- 그리드 `minmax(0,1fr) 380px`, gap `20px`(`gap-5`), `align-items: start`.
- `lg:` 미만(1024px 미만)에서는 1열.
- 지도 컬럼은 `sticky top-6`.
- 카카오 모빌리티 안내 문구는 지도 아래로 이동(지도 옆 사이드바가 자리).

`SavedItinerariesList.tsx`의 펼친 영역에서 `ItineraryResult` 직접 호출을
`SavedItineraryDetail`로 교체한다.

## 3. `DayMapPanel` — 지도 위 요약 배지

지도를 감싸는 `relative` 래퍼를 추가하고, 그 위에 절대배치 배지 하나를 올린다.
지도 자체(`ItineraryMap`)는 건드리지 않는다.

```tsx
const dayColor = "#F2542D"; // DayMapPanel/day 뷰는 항상 코랄(위 보정사항 3)

<section className="overflow-hidden rounded-[20px] border border-border bg-card">
  <div className="relative">
    <ItineraryMap variant="day" days={[mapDay]} heightClassName="h-[300px]" bare />

    <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded-[12px] border border-border bg-white/94 px-3 py-2 shadow-[0_6px_18px_-10px_rgba(48,20,12,.5)]">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: dayColor }} />
      <span className="text-[12.5px] font-extrabold text-foreground">{day.dayIndex}일차</span>
      <span aria-hidden="true" className="h-3 w-px bg-border" />
      <span className="text-[12px] text-[oklch(0.45_0.015_30)]">
        {[`${day.items.length}곳`, travelLabel].filter(Boolean).join(" · ")}
      </span>
    </div>
  </div>

  {/* 아래 요약·구간 목록·카카오맵 버튼은 기존 그대로 */}
</section>
```

시각 스펙:
- 위치 `left:12px; top:12px`, `z-index:10`.
- radius `12px`, padding `8px 12px`, 배경 `rgba(255,255,255,.94)`, 테두리 `1px solid var(--border)`.
- 그림자 `0 6px 18px -10px rgba(48,20,12,.5)`.
- 일차 점 `8px`, 일차 라벨 `12.5px/800`, 구분선 `1px×12px`, 보조값 `12px / oklch(0.45 0.015 30)`.
- **`pointer-events-none` 필수** — 지도 드래그를 막지 않아야 한다.
- 보조값은 `장소 수 · 이동 합계`(`dayTravelLabel(day, mapDay)` 재사용). 없으면 곳 수만.

기존 패널 하단(요약 줄·`DayRouteLegs`·카카오맵 버튼)은 **변경 없음**. 지도 높이도
`h-[300px]` 그대로.

## 4. 목록 행 — 펼친 헤더 스타일 + 메타 이동 거리

`SavedItinerariesList.tsx`의 펼친 행 헤더에 두 가지가 붙는다(접힌 카드 톤은 그대로 유지).

- 헤더 배경 `oklch(0.985 0.012 30)` + 하단 `1px solid oklch(0.94 0.012 30)` — 펼침 상태 표시.
- 메타 줄 끝에 코랄 강조로 `7곳 · 68.4km`(전체 장소 수 · 전체 이동 거리).
  - 장소 수 = `detail.data.days`의 모든 `items.length` 합.
  - 이동 거리 = `resolvedMapData.days`(스냅샷 또는 라이브) 중 `route`가 있는 날만 합산.
  - **합계를 낼 수 없으면(스냅샷/route 없음) 이 조각은 렌더하지 않는다** — 직선거리로
    대체하지 않는다.
  - `ItineraryMap.tsx`의 `caption()`이 이미 "route 있는 날만 합산" 로직을 갖고 있으므로,
    그 부분(직선거리 폴백 제외)을 `src/lib/itinerary.ts`의 새 함수로 옮겨 두 곳에서 쓴다:
    ```ts
    // route가 있는 날만 합산한 이동 거리·시간. 하나도 없으면 null.
    export function sumRouteTravel(
      days: ItineraryMapDay[],
    ): { km: number | null; minutes: number | null } | null
    ```
    `ItineraryMap.caption()`은 이 함수를 호출한 뒤 직선거리 폴백을 이어 붙이도록 리팩터링한다
    (동작 변화 없음, 로직 이동만).
- `보기` 버튼은 펼쳤을 때 `접기`로 바뀌고 스타일도 변한다(현재 동작 유지, 스타일만 추가):
  `접기: border 1px solid oklch(0.85 0.06 30) · bg oklch(0.955 0.04 30) · color oklch(0.52 0.19 28)`.

## 5. 페이지 폭

`src/app/itineraries/page.tsx`:

```diff
- <main className="container mx-auto max-w-3xl px-4 py-8">
+ <main className="container mx-auto max-w-7xl px-4 py-8">
```

## 6. 테스트

- `src/lib/itinerary.test.ts` — `sumRouteTravel` 신규: route 있는 날만 합산 / 전부 없으면 null.
- `src/app/itinerary/_components/ItineraryMap.test.tsx` — 기존 caption 케이스 회귀 확인(로직
  이동 후에도 동일 문구).
- `src/app/itinerary/_components/DayMapPanel.test.tsx`(기존 파일에 추가):
  - 요약 배지에 `1일차`와 `4곳`이 보인다.
  - `travelLabel`이 없을 때 배지에 `·`로 끝나는 빈 값이 남지 않는다.
  - 배지에 `pointer-events-none`이 걸려 있다.
- `src/app/itineraries/_components/SavedItineraryDetail.test.tsx`(신규):
  - 일차 탭을 누르면 지도 패널에 넘어가는 `selectedDayIndex`가 바뀐다.
  - `mapData`(스냅샷)를 주면 `useItineraryMapData`가 빈 배열로 호출된다(훅 모킹으로 확인).
- `src/app/itineraries/_components/SavedItinerariesList.test.tsx`(기존 파일에 추가):
  - 펼친 행에 `7곳 · 68.4km` 형태 메타가 보인다(스냅샷/route 있는 케이스).
  - route/스냅샷이 없으면 그 메타 조각이 렌더되지 않는다.

## 7. 하지 말 것

- `PlaceItem`/`DayCard`/`DayRouteLegs`/`DayTabs`의 마크업·스타일을 손대지 않는다.
- 시안의 지도 이미지는 목업이다. 마커·경로·라벨은 기존 `ItineraryMap` 카카오맵 오버레이가
  그대로 그린다. 대각선 줄무늬 배경, `kakao map` 캡션은 구현 대상이 아니다.
- 지도 위 오버레이는 요약 배지 하나까지. 구간 정보·카카오맵 버튼은 지도 밖(패널 하단).
- 좌표·경로가 없을 때 직선거리나 상수로 숫자를 만들지 않는다.
- `DayLegend`는 만들지 않는다(위 보정사항 3, 사용자 결정).
- `ItineraryMap`의 day 뷰 색상(`CORAL` 고정)은 바꾸지 않는다 — AI 일정 생성 결과·공유
  페이지 등 다른 화면에도 영향을 주는 변경이라 이번 범위 밖이다.

## 파일 변경 요약

| 파일 | 변경 |
| --- | --- |
| `src/app/itineraries/page.tsx` | 5(폭 `max-w-7xl`) |
| `src/app/itineraries/_components/SavedItinerariesList.tsx` | 2(상세 호출 교체), 4(헤더 스타일·메타) |
| `src/app/itineraries/_components/SavedItineraryDetail.tsx` | 신규(2) |
| `src/app/itinerary/_components/ItineraryResult.tsx` | 1(`hideMap`일 때 안내문 숨김) |
| `src/app/itinerary/_components/DayMapPanel.tsx` | 3(요약 배지) |
| `src/lib/itinerary.ts` | 4(`sumRouteTravel` 신규) |
| `src/app/itinerary/_components/ItineraryMap.tsx` | 4(`caption()`이 `sumRouteTravel` 사용하도록 리팩터) |

## 검증

```bash
bun run test
bun run lint
bun run build
bun run dev   # /itineraries → 저장된 일정 보기 → 2열(왼쪽 타임라인/오른쪽 sticky 지도),
              # 지도 위 배지, 펼친 헤더 스타일 + 이동거리 메타, 페이지 폭이 헤더와 동일
```
