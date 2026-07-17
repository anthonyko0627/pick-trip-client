# 저장한 일정 목록 조회 기능 (브라우저 로컬 기반)

## Context

Notion "Web MVP 구현 내용"의 MVP 기능표 "일정 저장" 행은 "로그인 후 저장한 일정
조회 가능"으로 정의돼 있다. 이슈 #29에서 "저장 및 공유 버튼" 중 **공유** 절반을
구현했고, "저장한 일정 목록 조회"는 그때 범위에서 제외했다 — 이번 계획이 그 절반을
다룬다.

조사 결과 이 기능에는 실제 걸림돌이 두 개 있다.
1. **로그인 자체가 프론트엔드에 전혀 없다.** 백엔드는 카카오 OAuth
   (`POST /api/v1/auth/login/kakao`)를 제공하지만, 로그인 UI/플로우는 이 저장소
   어디에도 구현돼 있지 않다.
2. **백엔드에 목록 조회 API가 없다.** `GET /api/v1/itineraries`가 존재하지 않고
   (OpenAPI 스펙 `/v3/api-docs` 직접 확인), 단건 조회(`GET
   /api/v1/itineraries/{id}`)만 있다. `GET /api/v1/users/me` 응답
   (`UserMeResponse`)에도 일정 목록 필드가 없다.

두 블로커 모두 지금 당장 "진짜" 계정 기반 저장 목록을 만드는 걸 막는다. 대신
**브라우저(디바이스) 로컬 저장 기반으로 지금 구현 가능한 근사 버전**을 만든다 —
`useBasket`이 이미 쓰고 있는 것과 동일한 localStorage 패턴이다. 실제 로그인 +
서버 목록 API가 갖춰지면 이 로컬 로직을 서버 조회로 교체해야 한다는 점을 문서에
명시해 후속 작업으로 남긴다.

## 접근 방식

- 일정을 저장(`saveItinerary()` 성공)할 때마다 그 요약 정보(itineraryId, title,
  region, travelDate, duration, savedAt)를 `useBasket`과 동일한 방식으로
  localStorage에 기록하는 `useSavedItineraries` 훅을 추가한다.
- `/itineraries`(신규 라우트)에서 이 목록을 보여준다. 각 항목을 클릭하면 그
  자리에서 펼쳐지며, 처음 펼칠 때만 `getItinerary(itineraryId)`(신규 서비스
  함수, 백엔드에 이미 존재하는 단건 조회 API)로 상세를 지연 조회해
  `ItineraryResult`(기존 컴포넌트, `editor` prop 없이 읽기 전용으로 이미 동작)로
  렌더한다.
- "목록에서 지우기" 버튼으로 로컬 목록에서만 제거한다(서버 삭제 API가 없으므로
  실제 삭제가 아님을 문구로 명확히 한다).
- 이 방식은 **디바이스/브라우저 범위**이지 계정 범위가 아니라는 한계를 화면 문구와
  계획 문서에 분명히 남긴다.

## 구현 범위

### 새로 만들 파일

| 파일 | 역할 |
|---|---|
| `src/hooks/useSavedItineraries.ts` | localStorage 기반 저장 일정 요약 목록 관리 (`useBasket`과 동일 패턴) |
| `src/hooks/useSavedItineraries.test.ts` | add/remove, 중복 itineraryId 시 갱신, localStorage 반영 테스트 |
| `src/app/itineraries/page.tsx` | Server Component — 메타데이터 + `SavedItinerariesList` 렌더 |
| `src/app/itineraries/_components/SavedItinerariesList.tsx` | Client — 목록 렌더, 항목별 펼치기(지연 상세 조회)/지우기 |
| `src/app/itineraries/_components/SavedItinerariesList.test.tsx` | 빈 상태, 목록 렌더, 펼치기(로딩/성공/에러), 지우기 테스트 |

### 수정할 파일

| 파일 | 변경 내용 |
|---|---|
| `src/types/itinerary.ts` | `SavedItinerarySummary { itineraryId, title, region, travelDate, duration, savedAt }` 추가 |
| `src/services/itineraryService.ts` | `getItinerary(itineraryId)`: `GET /api/v1/itineraries/{id}` 추가 (+ 테스트) |
| `src/app/itinerary/_components/ItineraryClient.tsx` | `handleSave()` 성공 시 `useSavedItineraries().add(...)` 호출 |

## 핵심 설계

### `useSavedItineraries.ts`

- storage key: `pick-trip-saved-itineraries`
- `useBasket.ts`와 동일한 불변 업데이트 + `localStorage.setItem` 동기화 패턴을
  그대로 재사용한다.
- `add(summary: SavedItinerarySummary)`: 같은 `itineraryId`가 이미 있으면 최신
  정보로 교체(재저장 시 갱신), 없으면 앞에 추가.
- `remove(itineraryId: string)`: 로컬 목록에서만 제거.
- `items`는 `savedAt` 내림차순으로 정렬해 반환.

### `SavedItinerariesList.tsx`

- 목록이 비어 있으면 "아직 저장한 일정이 없습니다" 안내만 표시.
- 각 항목: 제목/지역(`REGION_LABELS`)/날짜/기간 + "보기"/"목록에서 지우기" 버튼.
- "보기" 클릭 시 로컬 `expandedId` state로 해당 항목만 펼치고, 처음 펼칠 때만
  `getItinerary(itineraryId)`를 호출해 결과를 컴포넌트 상태에 캐시한다(재클릭 시
  재조회하지 않음). 로딩 중 "불러오는 중...", 실패 시 `parseApiError()` 메시지 +
  "다시 시도", 성공 시 `ItineraryResult`(read-only)로 렌더.

### `ItineraryClient.tsx` 연동

- `handleSave()`에서 `saveItinerary()` 성공 직후
  `addSavedItinerary({ itineraryId: saved.itineraryId, title: saved.title, region: saved.region, travelDate: saved.travelDate, duration: saved.duration, savedAt: Date.now() })`
  호출.

## 명시할 한계 (화면 문구 + 문서에 남김)

- 이 목록은 **이 브라우저에서 저장한 기록**이다. 다른 기기/브라우저에서는 보이지
  않고, 브라우저 저장소를 지우면 사라진다 — 실제 "로그인 계정 기준 저장 목록"이
  아니다.
- 백엔드 목록 조회 API와 로그인 기능이 준비되면 이 로컬 로직을 서버 조회로
  교체해야 한다 — 오픈 이슈로 남긴다.
- 전역 네비게이션이 아직 없어(현재 레이아웃이 create-next-app 기본 상태)
  `/itineraries`로 가는 링크가 없다. 이번 범위는 URL 직접 접근만 지원하고,
  네비게이션 추가는 별도 이슈로 둔다.

## 재사용할 기존 유틸/패턴

- `useBasket.ts`의 localStorage 불변 업데이트 패턴
- `ItineraryResult.tsx` — `editor` prop 생략 시 읽기 전용으로 이미 동작
- `parseApiError()`(`src/lib/errors.ts`), `REGION_LABELS`(`src/types/region.ts`)
- `src/app/itinerary/page.tsx`의 Server Component + `_components` Client 분리 패턴

## 검증

- `bun run test`(신규 훅/컴포넌트/서비스 테스트 포함), `bunx tsc --noEmit`,
  `bun run build`, `bun run lint`
- 수동: `/itinerary`에서 일정 생성 → 저장 → `/itineraries` 방문 → 방금 저장한
  항목이 보이는지, "보기" 클릭 시 상세가 펼쳐지는지, "지우기" 클릭 시 목록에서
  사라지는지, 새로고침 후에도 유지되는지(localStorage) 확인. 아무것도 저장하지
  않은 상태로 처음 방문 시 빈 상태 문구도 확인.
