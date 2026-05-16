# 파일 구조 규칙

## 기본 방향

Pick Trip Client는 Next.js App Router를 기준으로 라우트, 공유 UI, API 경계, 타입을 분리한다. 초기 MVP에서는 라우트 중심 구조를 유지하고, 특정 도메인이 충분히 커졌을 때만 별도 feature 구조로 승격한다.

## 권장 구조

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── contents/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── _components/
│   │       ├── ContentCard.tsx
│   │       ├── ContentFilter.tsx
│   │       └── ContentList.tsx
│   ├── itinerary/
│   │   ├── page.tsx
│   │   └── _components/
│   │       ├── ItineraryForm.tsx
│   │       └── ItineraryTimeline.tsx
│   └── share/
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── ui/
│   └── layout/
├── hooks/
│   └── useSelectedContents.ts
├── services/
│   ├── apiClient.ts
│   ├── contentService.ts
│   ├── itineraryService.ts
│   └── authService.ts
├── types/
│   ├── api.ts
│   ├── content.ts
│   └── itinerary.ts
└── lib/
    ├── utils.ts
    └── errors.ts
```

## 디렉터리 책임

| 경로 | 책임 |
| --- | --- |
| `src/app` | 라우팅, route-level UI, `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` |
| `src/app/**/_components` | 해당 라우트에서만 쓰는 컴포넌트 |
| `src/app/**/_lib` | 해당 라우트에서만 쓰는 작은 변환 함수, 상수, helper |
| `src/components/ui` | shadcn 기반 primitive UI와 재사용 가능한 기초 컴포넌트 |
| `src/components/layout` | 여러 라우트에서 공유하는 헤더, 내비게이션, 페이지 쉘 |
| `src/hooks` | 여러 라우트에서 재사용하는 클라이언트 훅 |
| `src/services` | API client, 도메인별 API 호출, DTO 변환 경계 |
| `src/types` | 도메인 타입, API request/response 타입, 공통 API 타입 |
| `src/lib` | 공통 유틸, 오류 정규화, 환경변수 helper 같은 비도메인 코드 |

## 라우트 구성 원칙

- `src/app` 아래에는 URL 구조와 직접 연결되는 폴더만 둔다.
- 라우트의 첫 화면은 `page.tsx`에서 조립하되, 복잡한 UI는 `_components`로 분리한다.
- route-level 로딩은 `loading.tsx`, 오류는 `error.tsx`, 404는 `not-found.tsx`를 사용한다.
- 여러 라우트에서 공유되기 전까지는 라우트 내부 `_components`에 둔다.
- 공유가 확실해진 컴포넌트만 `src/components`로 이동한다.

## API와 타입 경계

- API 호출은 컴포넌트 안에 길게 작성하지 않고 `src/services`에 둔다.
- `apiClient.ts`는 base URL, 공통 header, 오류 정규화 같은 공통 HTTP 경계를 담당한다.
- `contentService.ts`, `itineraryService.ts`, `authService.ts`처럼 도메인별 서비스 파일을 둔다.
- 서버 API DTO와 화면 ViewModel이 달라지면 서비스 또는 라우트 전용 `_lib`에서 변환한다.
- 외부 API 응답 타입은 `src/types`에 명시하고, 불명확한 값은 `unknown`에서 검증 후 좁힌다.

## 도메인 성장 시 승격 기준

다음 조건이 2개 이상 생기면 해당 도메인을 `src/features/<domain>` 구조로 옮기는 것을 검토한다.

- 한 도메인의 컴포넌트, 훅, 서비스, 타입이 여러 라우트에 걸쳐 강하게 결합된다.
- 도메인 내부 파일 수가 많아져 `components`, `hooks`, `services`, `types` 사이 추적 비용이 커진다.
- 도메인 단위 테스트나 상태 관리가 독립적으로 필요하다.
- 다른 도메인과 구분되는 비즈니스 규칙이 많아진다.

초기 MVP에서는 `features` 폴더를 먼저 만들지 않는다. 실제 복잡도가 생긴 뒤 이동한다.
