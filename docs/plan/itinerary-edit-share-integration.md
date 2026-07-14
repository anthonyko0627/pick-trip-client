# 일정 수정(feat/27) · 일정 공유(feat/29) 통합 및 디자인 적용

## Context

`feat/27`(일정 수정)과 `feat/29`(일정 공유)는 둘 다 커밋 `8498a99`(AI 일정 생성
계획 문서)에서 갈라진 형제 브랜치로, `feat/30`(→ 저장한 일정 목록 → 디자인 토큰
`feat/31`~`feat/35`로 이어지는 현재 작업 브랜치)에는 합쳐지지 않은 채 로컬에만
남아 있었다. 두 브랜치 모두 원격에 푸시되거나 PR로 열린 적이 없다.

`feat/35`(디자인 적용 완료) 기준으로 두 브랜치를 병합 시도한 결과:

- `feat/27`: `DayCard.tsx`, `ItineraryClient.tsx`(+test), `ItineraryResult.tsx`,
  `PlaceItem.tsx`, `itineraryService.ts`(+test) — 7개 파일 충돌
- `feat/29`: `ItineraryClient.tsx`(+test), `types/itinerary.ts` — 3개 파일 충돌

`feat/29`의 자체 계획 문서(`docs/plan/itinerary-share.md`)가 `AlternativePlacePicker`의
`PickerState` 패턴을 참고 패턴으로 언급하는 것으로 보아, `feat/29`는 `feat/27`이
먼저 존재한다는 전제로 설계되었다(`ItineraryResult`의 `editor` prop이 `feat/27`의
산출물). 따라서 **`feat/27`을 먼저 병합·정리한 뒤, 그 위에 `feat/29`를 병합**하는
순서로 진행한다 — `feat/22→27→30` 순서로 브랜치를 잇는 것과 같은 방식이다.

## 충돌 성격 요약

내 디자인 작업(`feat/32`~`feat/35`)과 `feat/27`이 같은 파일을 다른 이유로 건드려서
생기는 충돌이다 — 로직 자체가 서로 배타적이지 않다:

- `PlaceItem.tsx`: 내 쪽은 순서 배지(amber) + `reason`을 teal 팁 박스로 표시하는
  **읽기 전용 스타일링**. `feat/27` 쪽은 `isFirst`/`isLast`/`onMoveUp`/`onMoveDown`/
  `onRemove`/`onTogglePinned`/`onOpenReplacePicker` prop과 버튼 행을 추가하는
  **편집 기능**. → 내 스타일을 베이스로 유지하면서 `editable`일 때만 편집 버튼
  행을 추가한다.
- `DayCard.tsx`: 내 쪽은 "N일차" amber 배지 스타일링. `feat/27` 쪽은 콜백을
  `PlaceItem`으로 스레딩하는 로직. → 스타일 유지 + 콜백 스레딩 추가.
- `ItineraryResult.tsx`: 내 쪽은 시맨틱 토큰 스타일링(읽기 전용).
  `feat/27` 쪽은 `editor?: ItineraryEditor` prop을 받아 `AlternativePlacePicker`
  연동 + "변경사항 저장" 버튼 + 에러 배너를 추가하는 **`editor` prop이 없으면
  기존과 동일하게 읽기 전용으로 렌더**하는 구조(하위 호환). → `editor` prop 시스템을
  그대로 가져오고, 저장 버튼/에러 배너에 내 디자인 토큰(`text-destructive` 등)을
  입힌다.
- `ItineraryClient.tsx`: `"saved"` phase 렌더링이 내 쪽은 인라인 JSX,
  `feat/27` 쪽은 `SavedItineraryPanel` 컴포넌트(+`useItineraryEditor` 연동)로
  분리되어 있다. **내 쪽에만 있는 `useSavedItineraries().add(...)` 호출**
  (`handleSave()` 안, 로컬 "저장한 일정 목록" 갱신 — `feat/27`에는 이 훅 자체가
  없다)은 반드시 보존해야 한다. → `SavedItineraryPanel` 구조를 채택하되
  `handleSave()`의 `addSavedItinerary(...)` 호출은 유지한다.
- `itineraryService.ts`: 내 쪽엔 없는 `modifyItinerary()`만 `feat/27`이 추가 —
  순수 추가라 충돌은 병합 알고리즘상의 컨텍스트 라인 차이일 뿐, 실질적 로직 충돌
  없음.
- `types/itinerary.ts` (`feat/29`): `ShareCreateResponse`/`SharedItineraryResponse`
  순수 추가 — 충돌 없음.

## 진행 순서

### 1단계 — `feat/27` 병합 + 디자인 적용 (이슈 #36, 브랜치 `feat/36`)

1. `feat/35` 기준으로 `feat/36` 생성, `feat/27` 병합, 위 방침대로 충돌 해결.
2. 새로 들어오는 `useItineraryEditor.ts`, `AlternativePlacePicker.tsx`는 로직
   변경 없이 그대로 채택.
3. 디자인 적용:
   - `PlaceItem.tsx`: 편집 버튼 행(▲▼ 이동, 고정 토글, 대체 장소, 삭제)에
     기존 `Button` variant(`outline`/`secondary`/`destructive`) 그대로 사용 —
     이미 amber/gray 토큰을 상속하므로 별도 색상 지정 불필요. "삭제 확인"
     상태(`confirmingRemove`)만 유지.
   - `DayCard.tsx`: 콜백 스레딩만 추가, 배지 스타일은 내 기존 디자인 유지.
   - `ItineraryResult.tsx`: 저장 버튼/에러 배너에 `text-destructive` 적용.
   - `AlternativePlacePicker.tsx`: `#33`에서 만든 `BasketDrawer`의 바텀시트
     톤(rounded-t-2xl, `Icon name="close"`, 항목 카드 스타일)과 통일.
4. 검증: `lint`/`tsc`/`build`/`test` + 임시 목업 백엔드(`modifyItinerary`,
   `getContents` 응답 추가) + Playwright로 순서변경/고정/삭제/대체 장소 플로우
   실제 렌더링 확인.

### 2단계 — `feat/29` 병합 + 디자인 적용 (이슈 #37, 브랜치 `feat/37`, `feat/36` 기준)

1. `feat/36` 기준으로 `feat/37` 생성, `feat/29` 병합.
2. `ItineraryClient.tsx` 충돌: `ShareButton` import + `SavedItineraryPanel`
   안에 `<ShareButton itineraryId={data.itineraryId} />` 추가만 하면 되므로
   단순 병합.
3. 디자인 적용:
   - `ShareButton.tsx`: `text-gray-600`/`text-red-600`을 시맨틱 토큰으로 교체,
     "복사됨" 상태에 `text-teal-700` 적용(성공 톤 통일).
   - `src/app/share/[id]/page.tsx`: 다른 페이지들과 톤 통일(제목/메타 정보
     스타일, 에러 문구를 `text-destructive`로).
4. 검증: `lint`/`tsc`/`build`/`test` + 임시 목업 백엔드(`createShare`,
   `getSharedItinerary` 응답 추가) + Playwright로 공유 버튼 → 링크 생성 →
   `/share/[id]` 접근까지 실제 렌더링 확인.

## 명시할 위험

- `SaveItineraryRequest`가 전체 교체(full replace) 방식이라 동시 편집 시
  last-write-wins — `feat/27` 계획 문서에 이미 명시된 MVP 단계 허용 사항, 이번
  통합에서 새로 만들지 않는다.
- 실제 백엔드가 없는 환경이라 `dayIndex`/`order`가 0-based인지 1-based인지는
  `feat/27` 계획 문서의 가정(0-based)을 그대로 따른다 — 백엔드 연동 시 별도 확인
  필요(기존에도 열려 있던 오픈 이슈).
- `AlternativePlacePicker`/`ShareButton`은 로직을 바꾸지 않고 스타일만 입힌다 —
  두 브랜치의 기능 자체(무엇을 언제 호출하는지)는 계획대로 이미 검증된 설계이므로
  변경하지 않는다.

## 검증

각 단계마다 `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test`
통과 확인 + 임시 목업 백엔드/Playwright로 실제 플로우 렌더링 확인(이전 4개
라우트 작업과 동일한 방식).
