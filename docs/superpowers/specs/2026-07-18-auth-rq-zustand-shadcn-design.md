# 설계: React Query 도입 · 401 자동 재시도 · Zustand 상태 이관 · 로그인 Shadcn

작성일: 2026-07-18 · 브랜치: fix/auth (사용자 지시로 auth 외 작업도 포함)

## 목표

1. 클라이언트 API 호출을 fetch 대신 axios(apiClient)로 통일.
2. React Query를 배선하고 auth 세션·데이터 뮤테이션에 활용.
3. 401(AUTH_REQUIRED) 시 refresh 후 1회 자동 재시도.
4. 전역 클라이언트 상태(basket, saved)를 Zustand로 이관(persist).
5. 로그인 페이지를 Shadcn 컴포넌트로 리팩토링.

## 상태 경계

| 상태 | 담당 |
| --- | --- |
| 서버 상태(auth 세션, fetch 데이터) | React Query |
| 클라이언트 전역 상태(basket, saved) | Zustand + persist |
| 컴포넌트 지역 상태(editor days, phase) | useState |

## 고정 계약 (병렬 작업 경계)

- `src/hooks/useAuth`: `AuthProvider` export 유지. `useAuth()` →
  `{ status, accessToken, user, refresh, logout, runAuthed }`.
  - `refresh(): Promise<string | null>` (새 accessToken 반환)
  - `runAuthed<T>(fn: (token?: string) => Promise<T>): Promise<T>`
- `src/app/providers.tsx`: `Providers` export (QueryClientProvider → AuthProvider).
- `src/hooks/useBasket`: 공개 API 유지 —
  `{ items, add, remove, isInBasket, setPriority, clear, save }`.
- `src/hooks/useSavedItineraries`: 공개 API 유지 — `{ items, add, remove }`.
- localStorage 키 유지: `pick-trip-basket`, `pick-trip-saved-itineraries`.

## 워크스트림 (파일 소유 분리 — 충돌 없음)

- **A. RQ 인프라 + useAuth**: `app/providers.tsx`(신규), `app/layout.tsx`,
  `hooks/useAuth.tsx`, `hooks/useAuth.test.tsx`.
- **B. Zustand**: `stores/basketStore.ts`(신규), `stores/savedItinerariesStore.ts`(신규),
  `hooks/useBasket.ts`, `hooks/useSavedItineraries.ts` + 두 테스트.
- **C. 로그인 Shadcn**: `components/ui/card.tsx`(신규), `components/ui/alert.tsx`(신규),
  `app/login/page.tsx`.
- **D. ItineraryClient**: `app/itinerary/_components/ItineraryClient.tsx` + 테스트.

## 테스트 전략

- Header.test / ItineraryClient.test는 useAuth를 mock → useAuth 내부 변경 무영향.
- 실제 QueryClientProvider 필요 테스트: useAuth.test(A), ItineraryClient.test(D).
  공유 헬퍼 없이 각 테스트에 로컬 래퍼 인라인.
- ItineraryClient.test는 useBasket/useSavedItineraries를 mock으로 시드(스토어 하이드레이션 커플링 제거).

## 검증

lint(biome) · 전체 테스트(vitest) · 프로덕션 빌드 통과 후 fix/auth로 로컬 머지.
