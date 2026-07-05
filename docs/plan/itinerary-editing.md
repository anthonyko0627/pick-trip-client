# 일정 수정 기능 구현 계획

## Context

Notion "Web MVP 구현 내용" 페이지의 MVP 기능표 중 "일정 수정" 행은 구현 조건이 "장소 순서 변경, 삭제, 특정 장소 고정, 대체 장소 추가 가능"으로 정의되어 있고, 아직 담당 브랜치가 배정되지 않은 미구현 기능이다. "주요 화면 > 8. 일정 결과 화면" 항목에도 "장소 삭제, 순서 변경, 고정, 대체 장소 추가 기능 제공"이 명시돼 있다. ("저장 및 공유 버튼"은 이 기능과 별개의 화면 요소로 문서에 나열되어 있음 — 이후 섹션에서 구분함.)

이번 계획을 준비하며 Notion 문서와 별개로 백엔드 실제 OpenAPI 스펙(`http://localhost:8080/v3/api-docs`)을 직접 확인했는데, 현재 프론트엔드의 `src/types/itinerary.ts`/`src/services/itineraryService.ts`가 실제 백엔드 계약과 전혀 맞지 않는다는 것을 발견했다. "일정 수정"이 의존하는 `PATCH /api/v1/itineraries/{itineraryId}` 엔드포인트도 이 잘못된 타입 계열 위에 있으므로, 이번 계획은 **먼저 타입/서비스 계약을 실제 백엔드에 맞게 정렬한 뒤**, 그 위에 수정 UI/상태를 구현하는 순서로 진행한다.

**이번 계획 범위에서 명시적으로 제외 (별도 이슈로 기록):**
- 바구니(`useBasket`/`BasketPanel`/`BasketDrawer`/`ContentGrid`)를 localStorage에서 서버 바구니 API로 전환하는 작업.
- `POST /api/v1/itineraries/generate`가 요청 바디를 문서화하고 있지 않은 문제 — 새 이슈에 "백엔드 확인 필요" 코멘트로만 남기고, 이번 계획에서 해결하지 않는다.

**순서 변경 UX는 위/아래 화살표 버튼 방식으로 확정** (드래그 앤 드롭 아님 — 새 의존성 없이 구현, 접근성도 기본 확보).

---

## 현재 상태 요약

- `src/types/itinerary.ts`의 `GenerateItineraryRequest/Response`, `ItineraryDay`, `ItineraryPlace`는 실제 백엔드 스키마와 전혀 일치하지 않는다 (실제 계약이 확정되기 전에 추측성으로 설계된 것으로 보임).
- `src/services/itineraryService.ts`의 유일한 함수 `generateItinerary()`는 `/api/v1/itineraries`(POST)를 호출하는데, 이는 실제로 `save`(저장) 엔드포인트다. 실제 생성 엔드포인트는 `POST /api/v1/itineraries/generate`(요청 바디 미문서화 — 이번 범위 밖).
- `ItineraryClient.tsx`의 `ItineraryPhase` 상태 기계(`idle | loading | result | error`)는 `result` 단계에서 서버 응답을 그대로 들고 있을 뿐 편집 상태가 전혀 없다. "다시 생성" 버튼은 그냥 `idle`로 리셋하며 기존 데이터를 버린다.
- `ItineraryResult.tsx → DayCard.tsx → PlaceItem.tsx`는 콜백 prop이 하나도 없는 순수 읽기 전용 렌더 체인이며, `contentId`/`dayNumber`로 키를 잡는다.
- 드래그 앤 드롭 라이브러리는 설치돼 있지 않다 (`@dnd-kit/*`, `react-beautiful-dnd`, `framer-motion` 전부 없음). 배열 재정렬 유틸도 없다.
- `apiFetch<T>()`(`src/services/apiClient.ts`), `parseApiError()`(`src/lib/errors.ts`)는 그대로 재사용 가능하다.
- `BasketPanel`/`BasketDrawer`는 불변 업데이트 + 버튼 그룹 토글 패턴을, `BasketDrawer`는 손으로 만든 바텀시트 패턴(Radix Dialog 래퍼는 아직 없음)을 확립해뒀다.
- `contentService.ts`의 `getContents()`가 지역/날짜/기간 기준 콘텐츠 목록을 이미 제공하므로, "대체 장소 추가" 피커의 데이터 소스로 그대로 재사용 가능하다 (타입 정렬 후 `ItineraryResponse`에 `region`/`travelDate`/`duration`이 포함됨).

---

## 백엔드 실제 계약 (OpenAPI 직접 확인, ground truth)

```
POST   /api/v1/itineraries                  (save)    → SaveItineraryRequest  → ItineraryResponse
PATCH  /api/v1/itineraries/{itineraryId}     (modify)  → SaveItineraryRequest  → ItineraryResponse   ← 이번 기능이 사용할 엔드포인트
GET    /api/v1/itineraries/{itineraryId}     (getItinerary) →                 → ItineraryResponse
POST   /api/v1/itineraries/generate         (generate) → (요청 바디 미문서화, 별도 이슈) → ItineraryGenerateResponse
```

```json
SaveItineraryRequest: { title, region(enum), travelDate(date), duration(int32), days: DayRequest[] }
DayRequest:  { dayIndex(int32), items: ItemRequest[] }
ItemRequest: { contentId(required), title?, order?(int32), reason?, pinned?(boolean) }

ItineraryResponse: { itineraryId(uuid), title, region, travelDate, duration, lastModifiedAt, days: Day[] }
Day:  { dayId(uuid), dayIndex(int32), items: Item[] }
Item: { itemId(uuid), contentId, title, order(int32), reason, pinned(boolean) }
```

**중요**: 백엔드 `Item`에는 `startTime`/`endTime`/`stayDuration`/`needsVerification` 필드가 없다. 기존 `ItineraryPlace` 타입에 있던 이 필드들은 실제로 백엔드가 내려주지 않는 값이다. 이번 계획은 이 필드들을 **타입에서 제거**하고, "이 값들을 어디서 가져올지"는 백엔드팀 확인이 필요한 오픈 이슈로 남긴다 (가짜 계약을 지어내지 않는다).

`dayIndex`/`order`가 0-based인지 1-based인지는 스펙에 예시가 없어 불명확하다 — 구현 착수 직후 실제 백엔드에 curl로 확인하는 단계를 첫 번째 구현 단계로 둔다.

---

## 1. 타입 정렬 — `src/types/itinerary.ts`

```typescript
import type { Region } from "@/types/region";

// ── 저장/수정 요청 공용 (POST save, PATCH modify) ──
export interface SaveItineraryRequest {
  title: string;
  region: Region;
  travelDate: string; // "YYYY-MM-DD"
  duration: number;
  days: DayRequest[];
}

export interface DayRequest {
  dayIndex: number; // ⚠️ 0/1-based 여부 구현 착수 시 실제 백엔드로 검증
  items: ItemRequest[];
}

export interface ItemRequest {
  contentId: string;
  title?: string;
  order?: number; // ⚠️ 0/1-based 여부 검증 필요
  reason?: string;
  pinned?: boolean;
}

// ── 조회/수정 응답 공용 (GET, PATCH) ──
export interface ItineraryResponse {
  itineraryId: string;
  title: string;
  region: Region;
  travelDate: string;
  duration: number;
  lastModifiedAt: string;
  days: Day[];
}

export interface Day {
  dayId: string;
  dayIndex: number;
  items: Item[];
}

export interface Item {
  itemId: string;
  contentId: string;
  title: string;
  order: number;
  reason: string;
  pinned: boolean;
  // startTime/endTime/stayDuration/needsVerification 없음 — 백엔드 미제공, 별도 확인 필요
}
```

기존 `GenerateItineraryRequest`/`ItineraryContentInput`은 generate 엔드포인트 계약이 불명확한 채로 남으므로 당장 손대지 않되, `SaveItineraryRequest`와 혼동되지 않도록 이름/사용처를 정리한다.

---

## 2. 서비스 레이어 — `src/services/itineraryService.ts`

```typescript
import { apiFetch } from "@/services/apiClient";
import type { ItineraryResponse, SaveItineraryRequest } from "@/types/itinerary";

export async function getItinerary(itineraryId: string): Promise<ItineraryResponse> {
  return apiFetch<ItineraryResponse>(`/api/v1/itineraries/${itineraryId}`);
}

export async function modifyItinerary(
  itineraryId: string,
  request: SaveItineraryRequest,
): Promise<ItineraryResponse> {
  return apiFetch<ItineraryResponse>(`/api/v1/itineraries/${itineraryId}`, {
    method: "PATCH",
    body: JSON.stringify(request),
  });
}
```

`generateItinerary()`는 요청 바디가 불명확한 채로 남으므로 이번 이슈에서 고치지 않는다 (`// TODO: generate 엔드포인트 요청 바디 백엔드 확인 필요` 주석만 추가). `modifyItinerary`는 전체 교체(full replace) 방식이므로, 편집 UI는 항상 현재 로컬 상태 전체로 `days[]`를 구성해서 보내야 한다.

---

## 3. 편집 상태 관리 — `src/hooks/useItineraryEditor.ts` (신규)

```typescript
interface UseItineraryEditorOptions {
  itineraryId: string;
  initialDays: Day[];
}

interface UseItineraryEditorResult {
  days: Day[];
  isDirty: boolean;
  isSaving: boolean;
  saveError: { message: string; code?: string; traceId?: string } | null;
  moveItem: (dayId: string, itemId: string, direction: "up" | "down") => void;
  removeItem: (dayId: string, itemId: string) => void;
  togglePinned: (dayId: string, itemId: string) => void;
  replaceItem: (dayId: string, itemId: string, replacement: Content) => void;
  save: () => Promise<void>;
}
```

- `useBasket`과 동일한 불변 업데이트 패턴(`setDays(prev => prev.map(...))`)을 사용한다.
- `moveItem`/`removeItem`/`togglePinned`/`replaceItem`은 전부 로컬 상태만 바꾸는 순수 클라이언트 동작이며, 매 동작마다 `order`를 배열 위치 기준으로 재계산한다. 네트워크 호출은 `save()`에서만 발생한다.
- `save()`는 현재 `days`를 `SaveItineraryRequest`로 변환(`itemId`/`dayId` 등 서버 전용 필드 제거)해 `modifyItinerary()`를 호출하고, 성공 시 서버 응답으로 로컬 상태를 교체하며 `isDirty`를 해제한다. 실패 시 로컬 편집 내용은 그대로 유지한다.

`ItineraryClient.tsx`의 상태 기계를 다음과 같이 확장한다:

```typescript
type ItineraryPhase =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; data: ItineraryResponse } // was GenerateItineraryResponse
  | { status: "error"; message: string; code?: string; traceId?: string };
```

`result` 단계에서만 `useItineraryEditor({ itineraryId: phase.data.itineraryId, initialDays: phase.data.days })`를 사용하고, 반환된 상태/액션을 `ItineraryResult`로 전달한다. "다시 생성" 클릭 시 `isDirty`가 true이면 확인 절차를 넣을지는 구현 중 UX 세부사항으로 결정한다 (계획을 막는 사항 아님).

---

## 4. UI 컴포넌트

`src/app/itinerary/_components/` 아래:

| 파일 | 변경 내용 |
|---|---|
| `PlaceItem.tsx` (수정) | `order`, `isFirst`, `isLast`, `onMoveUp`, `onMoveDown`, `onRemove`, `onTogglePinned`, `onOpenReplacePicker` prop 추가. 위/아래 화살표 버튼, 📌 고정 토글, 🗑 삭제 버튼 렌더 |
| `DayCard.tsx` (수정) | 콜백에 `itemId`를 바인딩해 `PlaceItem`으로 스레딩. 첫/마지막 항목의 이동 버튼 비활성화 |
| `ItineraryResult.tsx` (수정) | `ItineraryResponse` 기준으로 변경. 편집 액션을 `DayCard`로 전달. "변경사항 저장" 버튼 + dirty/saving/에러 인라인 배너 렌더 |
| `AlternativePlacePicker.tsx` (신규) | `BasketDrawer`의 바텀시트 패턴 재사용. `getContents({ regions: [region], startDate: travelDate, nights: duration })`로 후보 조회, `ContentCard` 스타일 재사용하되 액션 버튼을 "이 장소로 교체"로 교체 |

콜백 시그니처 (기존 `onRemove`/`onSetPriority` 네이밍 컨벤션 유지, `dayId`는 상위에서 미리 바인딩):

```typescript
// ItineraryResult
onMoveItem(dayId, itemId, direction) / onRemoveItem(dayId, itemId) /
onTogglePinned(dayId, itemId) / onOpenReplacePicker(dayId, itemId)

// DayCard → PlaceItem (dayId 이미 바인딩됨)
onMoveUp() / onMoveDown() / onRemove() / onTogglePinned() / onOpenReplacePicker()
```

**삭제 확인**: 되돌릴 수 없는(저장 전까지는 로컬이지만) 동작이므로 모달 대신 간단한 인라인 확인(예: 한 번 더 클릭 확인) 방식을 쓴다 — `src/components/ui`에 Dialog 원시 컴포넌트가 아직 없으므로 이 기능 하나 때문에 새로 만들지 않는다.

**고정(pinned) 의미**: v1에서는 고정이 수동 순서 변경을 막지 않는다 — 단순히 서버로 보내는 메타데이터(`pinned: true/false`)로만 취급한다. 이 가정은 구현 중 재확인 대상으로 남긴다.

---

## 5. 순서 변경 방식 — 위/아래 화살표 버튼 (확정)

새 의존성 없이 구현한다. `src/app/itinerary/_components/PlaceItem.tsx`에 ▲▼ 버튼을 추가하고, 클릭 시 `useItineraryEditor`의 `moveItem(dayId, itemId, "up" | "down")`을 호출한다. 배열 스왑 로직은 별도 유틸로 과하게 추상화하지 않고 훅 내부에 인라인으로 둔다 (재사용처가 생기기 전까지는 분리하지 않음). 각 `PlaceItem`은 `isFirst`/`isLast`를 받아 해당 방향 버튼을 비활성화한다.

---

## 6. 저장 흐름

**명시적 "변경사항 저장" 버튼 방식** (액션마다 자동 저장하지 않음).

- 모든 편집 동작(순서변경/삭제/고정/교체)은 로컬 상태만 바꾼다. `modifyItinerary()`는 전체 `days[]`를 교체하는 PATCH이므로, 클릭마다 자동 저장하면 불필요한 풀페이로드 요청과 경쟁 상태(rapid click)를 유발한다.
- 버튼 라벨은 **"변경사항 저장"**으로 명명해, Notion 문서의 "8. 일정 결과 화면"에 나열된 미래의 "저장 및 공유 버튼"(일정을 공식 저장/공유 가능하게 만드는 별도 기능일 가능성)과 혼동되지 않게 한다.
- 버튼은 `!isDirty || isSaving`일 때 비활성화. 저장 성공 시 dirty 해제, 실패 시 로컬 편집 내용 유지.
- **오픈 질문**: 편집 화면에 도달하는 시점에 일정이 이미 서버에 저장되어(`itineraryId`가 실존) 있다고 가정한다. `generate`가 아무것도 저장하지 않는다면 `PATCH`를 호출할 대상 자체가 없을 수 있음 — 이 부분은 위 "제외 범위"의 generate 오픈 이슈와 함께 백엔드팀 확인이 필요하다.

---

## 7. 에러 처리

`modifyItinerary()` 실패 시 `parseApiError()`를 그대로 재사용한다 (`ItineraryClient.tsx`의 기존 generate 에러 처리와 동일 패턴). 전체 화면 `ErrorState`는 재사용하지 않는다 — 저장 실패 후에도 사용자의 편집 내용이 계속 보이고 편집 가능해야 하기 때문이다. 대신 `ItineraryResult.tsx`의 저장 버튼 근처에 `message` + `traceId` + "다시 저장" 버튼을 가진 인라인 에러 배너를 추가한다. 저장 실패 시에도 로컬 편집 내용은 절대 버리지 않는다.

---

## 8. 테스트 계획

| 파일 | 신규/수정 | 커버리지 |
|---|---|---|
| `src/hooks/useItineraryEditor.test.ts` | 신규 | 순서변경(경계 포함)/삭제/고정토글/교체, 저장 성공(올바른 `SaveItineraryRequest` 구성 확인)/실패(에러 노출, 로컬 상태 유지) |
| `src/services/itineraryService.test.ts` | 신규 | `getItinerary`/`modifyItinerary`가 올바른 URL/메서드/바디로 `apiFetch` 호출하는지 (mock) |
| `PlaceItem.test.tsx` | 수정 | 신규 prop 렌더, 첫/마지막 버튼 비활성화, 각 콜백 호출 확인 |
| `DayCard.test.tsx` | 수정 | `itemId` 바인딩 확인 |
| `ItineraryResult.test.tsx` | 수정 | 저장 버튼, dirty/saving/에러 상태 렌더 |
| `AlternativePlacePicker.test.tsx` | 신규 | 열기/닫기, 후보 목록 로딩/빈/에러 상태, 교체 콜백 |
| `ItineraryClient.test.tsx` | 수정 | 새 `result` phase 형태 + 에디터 훅 연동 |

---

## 9. 검증 방법

로그인 우회 수단이 없으므로(실제 Google OAuth2만 존재, 이번 세션에서 확인 완료) 수동 검증이 필요하다.

1. `bun run dev`, 실제 Google 계정으로 로그인.
2. `/select → /select/conditions → /contents`에서 콘텐츠 2개 이상 담고 일정 생성해 `/itinerary` result 단계 진입.
3. **구현 착수 직후** 실제 백엔드에 curl로 `PATCH /api/v1/itineraries/{id}` 테스트 요청을 보내 `dayIndex`/`order`가 0-based인지 1-based인지 먼저 확인한다.
4. 순서 변경: 화살표 클릭 → 순서 반영 확인, 경계 버튼 비활성화 확인.
5. 삭제: 항목 삭제 → 나머지 재번호 확인.
6. 고정: 토글 → 시각적 표시 확인.
7. 대체 장소 추가: 피커 오픈 → 지역/날짜/기간 기준 후보 목록 확인 → 교체 확인.
8. "변경사항 저장" 클릭 → 로딩 → 성공 후 페이지 새로고침(`getItinerary` 재조회)으로 실제로 서버에 반영됐는지 확인.
9. 저장 실패 상황(네트워크 차단 등) 재현 → 에러 배너 확인, 로컬 편집 내용 보존 확인.
10. 모바일 너비에서 피커/버튼 겹침 확인.
11. `bun run lint && bun run build && bun run test` 통과 확인.

---

## 구현 순서

1. `src/types/itinerary.ts` 타입 정렬
2. `src/services/itineraryService.ts` — `getItinerary`/`modifyItinerary` 추가
3. 실제 백엔드로 `dayIndex`/`order` 0/1-based curl 확인 (다른 모든 작업보다 먼저)
4. `src/hooks/useItineraryEditor.ts` + 단위 테스트
5. `PlaceItem.tsx` — 컨트롤/prop/테스트
6. `DayCard.tsx` — 콜백 스레딩/테스트
7. `ItineraryResult.tsx` — 에디터 연동, 저장 버튼, 에러 배너, 테스트
8. `AlternativePlacePicker.tsx` + 테스트
9. `ItineraryClient.tsx` — `useItineraryEditor` 연동, phase 타입 갱신, 테스트 갱신
10. 수동 E2E 검증 (9번 섹션)
11. `bun run lint && bun run build && bun run test`

---

## 새 이슈에 남길 오픈 이슈 목록

1. 백엔드 `Item` 스키마에 `startTime`/`endTime`/`stayDuration`/`needsVerification`이 없음 — 어디서/어떻게 보강할지 백엔드 확인 필요.
2. `POST /api/v1/itineraries/generate` 요청 바디 미문서화 — 백엔드 확인 필요.
3. `dayIndex`/`order` 0/1-based 여부 — 구현 착수 시 실제 검증.
4. 편집 화면 도달 시점에 `itineraryId`가 이미 실존(저장됨)한다는 가정 — generate가 아무것도 저장하지 않으면 이 기능 자체가 막힘, 2번과 함께 확인 필요.
5. 고정(pinned) 항목의 수동 순서 변경 허용 여부 — v1은 허용(advisory-only)으로 가정, 프로덕트 확인 필요.
6. `SaveItineraryRequest`가 전체 교체 방식이라 동시 편집 시 last-write-wins — MVP 단일 사용자 가정하에는 허용.

## 후속 이슈 (이번 계획 범위 밖)

- 바구니(`useBasket` 등)를 localStorage에서 서버 바구니 API(`/api/v1/baskets/*`)로 전환.

---

### 구현 대상 핵심 파일
- `src/types/itinerary.ts`
- `src/services/itineraryService.ts`
- `src/hooks/useItineraryEditor.ts` (신규)
- `src/app/itinerary/_components/ItineraryClient.tsx`
- `src/app/itinerary/_components/ItineraryResult.tsx`
- `src/app/itinerary/_components/PlaceItem.tsx`
- `src/app/itinerary/_components/DayCard.tsx`
- `src/app/itinerary/_components/AlternativePlacePicker.tsx` (신규)
