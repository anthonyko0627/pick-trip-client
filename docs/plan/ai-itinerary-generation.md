# AI 일정 생성 기능 구현 계획

## Context

Notion "Web MVP 구현 내용" 기준, 구현 우선순위 8번(AI 일정 생성 화면)과 9번(일정 결과 화면)이 미구현 상태다.
현재 플로우는 지역 선택 → 조건 설정 → 콘텐츠 탐색/바구니까지만 연결되어 있고, 바구니에서 AI 일정 생성으로 이어지는 경로가 없다.
이번 계획은 바구니 → 일정 생성 요청 → 결과 확인 흐름을 완성하는 것이 목표다. 일정 수정/저장/공유는 별도 태스크.

## 현재 상태 요약

- **조건 전달 방식**: URL params (`regions`, `startDate`, `nights`, `companions`) → /contents
- **바구니 상태**: `useBasket()` 훅 → localStorage(`pick-trip-basket`)
- **API 패턴**: `apiFetch<T>()` wrapper → 서비스 함수 → 컴포넌트에서 호출
- **에러 계약**: 서버 응답 `{ code, message, traceId }` (현재 `apiFetch`는 raw throw, 정규화 없음)
- **재사용 가능**: `Button` 컴포넌트, `cn()`, `BasketPanel`, `BasketDrawer`, `ContentGrid`, `apiFetch`, `useBasket`

## 구현 범위

### 새로 만들 파일

| 파일 | 역할 |
|------|------|
| `src/types/itinerary.ts` | API 요청/응답 타입 정의 |
| `src/lib/errors.ts` | `apiFetch` 오류를 `{message, code, traceId}`로 정규화 |
| `src/services/itineraryService.ts` | `generateItinerary()` 함수 (POST /api/v1/itineraries) |
| `src/app/itinerary/page.tsx` | Server Component — searchParams await, ItineraryClient 렌더 |
| `src/app/itinerary/loading.tsx` | 라우트 진입 시 스켈레톤 |
| `src/app/itinerary/_components/ItineraryClient.tsx` | Client — 상태 기계 오케스트레이터 |
| `src/app/itinerary/_components/TripSummary.tsx` | 여행 조건 + 바구니 아이템 요약 표시 |
| `src/app/itinerary/_components/GeneratingState.tsx` | 로딩 스피너 + 안내 문구 |
| `src/app/itinerary/_components/ErrorState.tsx` | 오류 메시지 + 재시도 버튼 |
| `src/app/itinerary/_components/ItineraryResult.tsx` | 날짜별 DayCard 목록 |
| `src/app/itinerary/_components/DayCard.tsx` | 하루 일정 카드 |
| `src/app/itinerary/_components/PlaceItem.tsx` | 장소 한 줄 — 시간/이유/뱃지 |

### 수정할 기존 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/app/contents/page.tsx` | `itineraryHref` 문자열 조합 후 ContentGrid props에 추가 |
| `src/app/contents/_components/ContentGrid.tsx` | `itineraryHref` prop 추가, BasketPanel/BasketDrawer에 전달 |
| `src/app/contents/_components/BasketPanel.tsx` | `canGenerate`, `onGenerate` props 추가, "AI 일정 생성" 버튼 하단에 추가 |
| `src/app/contents/_components/BasketDrawer.tsx` | 동일 |

## 핵심 타입 (`src/types/itinerary.ts`)

```typescript
import type { BasketPriority } from "@/types/basket";
import type { CompanionCondition } from "@/types/travel-condition";
import type { Region } from "@/types/region";

export interface GenerateItineraryRequest {
  regions: Region[];
  startDate: string;        // "YYYY-MM-DD"
  nights: number;           // 0 = 당일치기
  companions: CompanionCondition[];
  contents: { contentId: string; priority: BasketPriority | null }[];
}

export interface GenerateItineraryResponse {
  itineraryId: string;
  days: ItineraryDay[];
  generatedAt: string;
}

export interface ItineraryDay {
  date: string;             // "YYYY-MM-DD"
  dayNumber: number;
  places: ItineraryPlace[];
}

export interface ItineraryPlace {
  contentId: string;
  name: string;
  startTime: string;        // "HH:mm"
  endTime: string;
  stayDuration: string;     // "1시간 30분"
  reason: string;           // AI 배치 이유
  needsVerification: boolean;
}
```

## 상태 기계 (`ItineraryClient.tsx`)

```
idle ──[생성 클릭]──> loading ──[성공]──> result
                              └──[실패]──> error ──[재시도]──> loading
```

- `idle` / `loading` / `error`: TripSummary 표시, 상태별 버튼/메시지 분기
- `result`: ItineraryResult 표시 (TripSummary 숨김), "다시 생성" 버튼 제공
- 생성 중 중복 요청 방지: `phase.status === "loading"` 가드

## 진입점 연결 방식

`contents/page.tsx`(Server Component)에서 searchParams로 `itineraryHref`를 조합 → ContentGrid props로 전달 → BasketPanel/BasketDrawer 버튼의 `router.push()` 대상으로 사용.
`useSearchParams()`를 Client에서 쓰지 않으므로 Suspense 경계 추가 불필요.

```
/contents?regions=HADONG&startDate=2025-07-15&nights=1&companions=WITH_KIDS
         ↓ "AI 일정 생성" 버튼 (items.length >= 2 일 때만 활성)
/itinerary?regions=HADONG&startDate=2025-07-15&nights=1&companions=WITH_KIDS
```

## 구현 순서

1. `src/types/itinerary.ts`
2. `src/lib/errors.ts`
3. `src/services/itineraryService.ts`
4. `src/app/itinerary/_components/PlaceItem.tsx`
5. `src/app/itinerary/_components/DayCard.tsx`
6. `src/app/itinerary/_components/ItineraryResult.tsx`
7. `src/app/itinerary/_components/TripSummary.tsx`
8. `src/app/itinerary/_components/GeneratingState.tsx`
9. `src/app/itinerary/_components/ErrorState.tsx`
10. `src/app/itinerary/_components/ItineraryClient.tsx`
11. `src/app/itinerary/page.tsx`
12. `src/app/itinerary/loading.tsx`
13. `src/app/contents/page.tsx` 수정 (itineraryHref 조합)
14. `src/app/contents/_components/ContentGrid.tsx` 수정
15. `src/app/contents/_components/BasketPanel.tsx` 수정
16. `src/app/contents/_components/BasketDrawer.tsx` 수정

## 검증

### E2E 흐름
1. `/select` → 지역 선택 → `/select/conditions?regions=HADONG`
2. 날짜/기간/동행 설정 → `/contents?regions=HADONG&...`
3. 콘텐츠 2개 이상 담기 → BasketPanel에 "AI 일정 생성" 버튼 활성 확인
4. 버튼 클릭 → `/itinerary?regions=HADONG&...` 이동
5. TripSummary에 지역/날짜/동행/바구니 항목 표시 확인
6. "일정 생성하기" 클릭 → 로딩 상태 확인 → 결과(DayCard) 또는 에러 표시 확인
7. 에러 시 재시도 버튼 클릭 → 다시 loading 전환 확인

### 엣지 케이스

| 케이스 | 기대 동작 |
|--------|---------|
| 바구니 1개 이하 | "AI 일정 생성" 버튼 비활성 + 안내 문구 |
| `/itinerary` 직접 접근 (params 없음) | 빈 요약, 생성 버튼 비활성 |
| 네트워크 단절 | "네트워크 연결 확인" 메시지, 재시도 버튼 |
| API 400/500 | 서버 `message` 표시, 재시도 버튼 |
| 생성 중 재클릭 | loading 가드로 중복 차단 |
| `days: []` 응답 | "생성된 일정이 없습니다" 빈 상태 |

### 빌드 검증
```bash
bun run lint && bun run build
```

## 후속 발견: LAN IP(192.168.55.213)로 접속 시 일정 생성 403

`allowedDevOrigins`(`next.config.ts`)로 LAN에서 개발 서버 접속을 허용한 뒤,
`http://192.168.55.213:3000`으로 접속해 일정 생성을 시도하면 `POST /api/v1/itineraries`가
403으로 실패한다. `http://localhost:3000`으로 접속하면 동일 요청이 401
`AUTH_REQUIRED`(로그인 필요 - 정상)로 응답한다.

### 원인

- `apiClient.ts`/`next.config.ts`의 same-origin 프록시 구조 자체는 정상 동작 (설계대로).
- 브라우저는 same-origin POST 요청에도 `Origin` 헤더를 붙이고, Next.js dev 서버의
  `rewrites`는 이 `Origin` 헤더를 변경 없이 백엔드(8080)로 그대로 전달한다.
- 백엔드(`pick-trip-server`)의 CORS 허용 오리진 목록에 `http://localhost:3000`만
  등록돼 있고 `http://192.168.55.213:3000`은 없어서, Spring Security의 `CorsFilter`가
  컨트롤러(인증 로직)에 도달하기 전에 403 `Invalid CORS request`로 차단한다.
- curl로 Origin 헤더만 바꿔 백엔드(8080)에 직접 재현해 확인함:
  - `Origin: http://localhost:3000` → 401 `AUTH_REQUIRED`
  - `Origin: http://192.168.55.213:3000` → 403 `Invalid CORS request` (plain text,
    에러 계약 JSON이 아님 → 필터 단계 차단이라는 증거)

### 결론 및 범위

- `pick-trip-client` 쪽 코드 수정 사항 없음 (원인이 백엔드 CORS 설정에 있음).
- `pick-trip-server`의 CORS 허용 오리진에 LAN 접속용 오리진(또는 로컬 네트워크 패턴)을
  추가하는 작업이 필요하며, 이는 이 저장소/브랜치(`feat/24`) 범위 밖이다.
- 당장은 로컬 개발/테스트를 `http://localhost:3000`으로 진행하고, 모바일 등 LAN 기기에서
  실제 일정 생성까지 검증해야 할 때 백엔드 팀에 CORS 허용 오리진 추가를 요청한다.
