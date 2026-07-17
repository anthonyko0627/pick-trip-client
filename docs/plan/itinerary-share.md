# 일정 공유 기능 구현 계획

## Context

Notion "Web MVP 구현 내용"의 "주요 화면 > 8. 일정 결과 화면"은 "저장 및 공유 버튼
제공"을 요구하고, "9. 공유 일정 화면"이라는 별도 섹션에서 "공유 토큰/링크로 접근
가능한 읽기 전용 일정 화면"을 정의한다. "저장"은 이슈 #22에서 이미 구현됐다
(`POST /api/v1/itineraries` → `saveItinerary()`, `ItineraryClient.tsx`의 `"saved"`
phase). 이번 계획은 아직 구현되지 않은 **공유** 절반을 완성한다.

백엔드(`pick-trip-server`) OpenAPI 스펙(`/v3/api-docs`, 이번 세션에 직접 확인)에
공유 API가 이미 준비돼 있다:

```
POST /api/v1/itineraries/{itineraryId}/share  (createShare) → ShareCreateResponse { token, shareUrl }
GET  /api/v1/share/{token}                    (getSharedItinerary) → SharedItineraryResponse { title, region, travelDate, duration, days }
```

`AGENTS.md`의 권장 파일 구조에 이미 `src/app/share/[id]/page.tsx`가 명시돼 있어,
이 라우트가 공유 기능의 진입점으로 예정돼 있었다.

**이번 계획 범위에서 제외**: Notion에 함께 나열된 "일정 저장: 로그인 후 저장한
일정 조회 가능"(저장 목록 화면)은 백엔드에 목록 조회 API 자체가 없어(`GET
/api/v1/itineraries`가 존재하지 않음, 단건 조회 `GET /api/v1/itineraries/{id}`만
있음) 이번 범위에서 제외하고 별도 이슈로 남긴다.

## 현재 상태 요약

- `ItineraryClient.tsx`의 `SavedItineraryPanel`(`"saved"` phase)이 `data.itineraryId`를
  이미 들고 있고, `useItineraryEditor` + `ItineraryResult`를 렌더한다. 공유 버튼은
  이 컴포넌트 안, 기존 "일정이 저장되었습니다." 안내문 옆에 추가하는 것이 가장
  자연스럽다.
- `"saved"` phase에 도달하려면 이미 `generateItinerary()`(인증 필요, 401
  `AUTH_REQUIRED` 시 `loginPreview`로 빠짐)와 `saveItinerary()`를 모두 통과해야
  하므로, 이 시점엔 항상 실제 로그인 세션이 유효하다 — `createShare` 호출에 별도
  로그인 전 미리보기 처리가 필요 없다.
- 클립보드 복사 패턴은 코드베이스에 전혀 없어 새로 만든다(`navigator.clipboard.writeText`).
- `apiFetch()`(`src/services/apiClient.ts`)는 서버(Server Component)에서 백엔드로
  직접, 브라우저에서 same-origin으로 요청하는 구조라 인증이 필요 없는 공개 GET
  (`/api/v1/share/{token}`)도 그대로 재사용 가능하다(쿠키 전달 로직 없이도 동작).
- `.agents/rules/test-convention.md`는 "일정 생성, 저장, 공유처럼 핵심 플로우는
  E2E 테스트 후보"로 이미 명시하고 있고, 프로젝트에 `page.tsx`(async Server
  Component) 자체를 단위 테스트하는 선례가 없다 — `/share/[id]/page.tsx`는 단위
  테스트 대상에서 제외하고 수동 검증으로 다룬다.

## 구현 범위

### 새로 만들 파일

| 파일 | 역할 |
|---|---|
| `src/services/shareService.ts` | `createShare(itineraryId)`, `getSharedItinerary(token)` |
| `src/services/shareService.test.ts` | 위 두 함수가 올바른 URL/메서드로 `apiFetch`를 호출하는지 |
| `src/app/itinerary/_components/ShareButton.tsx` | "공유하기" 버튼 — idle → loading → 링크+복사 버튼 → 에러 |
| `src/app/itinerary/_components/ShareButton.test.tsx` | 각 상태 전환, 복사 버튼 클릭 시 `navigator.clipboard.writeText` 호출 확인 |
| `src/app/share/[id]/page.tsx` | 공개 읽기 전용 공유 화면 (async Server Component, `params.id`가 공유 토큰) |
| `src/app/share/[id]/loading.tsx` | `src/app/itinerary/loading.tsx`와 동일한 스켈레톤 패턴 재사용 |

### 수정할 파일

| 파일 | 변경 내용 |
|---|---|
| `src/types/itinerary.ts` | `ShareCreateResponse { token: string; shareUrl: string }`, `SharedItineraryResponse { title, region, travelDate, duration, days: Day[] }` 추가 |
| `src/app/itinerary/_components/ItineraryClient.tsx` | `SavedItineraryPanel`에 `<ShareButton itineraryId={data.itineraryId} />` 추가 |

## 핵심 설계

### `ShareButton.tsx`

로컬 상태만으로 충분해 별도 훅 없이 컴포넌트 안에서 관리한다(`AlternativePlacePicker`의
`PickerState` 패턴과 동일하게 `idle | loading | created | error` 유니언).

- `idle`: "공유하기" 버튼
- 클릭 → `loading`: 버튼 비활성화 + "생성 중..."
- 성공 → `created`: `shareUrl`을 읽기 전용 입력창 또는 텍스트로 표시 + "복사" 버튼
  (`navigator.clipboard.writeText(shareUrl)`, 클릭 시 잠깐 "복사됨" 표시)
- 실패 → `error`: `parseApiError()` 재사용, 메시지 + "다시 시도" 버튼

재생성(새 링크 발급) UI는 이번 범위에 넣지 않는다 — 한 번 만든 링크를 보여주는
것으로 충분하고, 필요성이 확인되면 후속 이슈로 넘긴다.

### `/share/[id]/page.tsx`

```typescript
interface SharePageProps {
  params: Promise<{ id: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { id: token } = await params;
  try {
    const data = await getSharedItinerary(token);
    return (
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="text-xl font-bold">{data.title}</h1>
        <p className="text-sm text-gray-500">
          {REGION_LABELS[data.region]} · {data.travelDate} · {formattedDuration}
        </p>
        <ItineraryResult data={data} />
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-red-600">유효하지 않거나 만료된 공유 링크입니다.</p>
      </main>
    );
  }
}
```

- `params`는 Next 16 규칙대로 Promise로 받는다(기존 `itinerary/page.tsx`와 동일한
  방식 — 별도 `PageProps` 헬퍼는 기존 코드에서 쓰지 않으므로 맞춰서 안 쓴다).
- `ItineraryResult`는 `editor` prop 없이 호출해 기존 읽기 전용 렌더링을 그대로
  재사용한다(수정 기능 없음 — Notion 스펙상 공유 화면은 읽기 전용).
- 기간 포맷(`0박 → 당일치기`, 그 외 `n박 n+1일`)은 `TripSummary.tsx`에 있는 것과
  동일한 1줄 로직이라 별도 유틸로 추출하지 않고 페이지 안에 인라인으로 둔다.
- 토큰이 유효하지 않거나 만료된 경우(백엔드 에러) 전체 화면을 막는 대신 간단한
  안내 문구만 보여준다.

## 재사용할 기존 유틸/패턴

- `apiFetch<T>()`(`src/services/apiClient.ts`), `parseApiError()`(`src/lib/errors.ts`)
- `ItineraryResult`(`src/app/itinerary/_components/ItineraryResult.tsx`) — `editor`
  prop 생략 시 읽기 전용으로 이미 동작
- `REGION_LABELS`(`src/types/region.ts`)
- `AlternativePlacePicker.tsx`의 로컬 유니언 상태 패턴(로딩/성공/에러)

## 검증

- `bun run test`(신규 `shareService.test.ts`, `ShareButton.test.tsx` 포함),
  `bunx tsc --noEmit`, `bun run build`, `bun run lint`
- `/share/[id]/page.tsx`는 단위 테스트 대상이 아니므로(테스트 컨벤션상 E2E 후보),
  `bun run dev`로 실제 로그인 후 "공유하기" 클릭 → 발급된 링크를 새 시크릿
  창(비로그인 상태)으로 열어 읽기 전용 화면이 뜨는지, 잘못된 토큰으로 접근 시
  안내 문구가 뜨는지 수동 확인한다.
