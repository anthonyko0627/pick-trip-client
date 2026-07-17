# 로그인/회원가입 (Kakao OAuth) 구현 계획

## Context

Notion "Web MVP 구현 내용" 페이지의 MVP 기능표에서 "로그인 / 회원가입" 행은 구현
조건이 "Kakao 또는 Google 소셜 로그인으로 정상 인증 가능"으로 정의돼 있고, 아직
담당 브랜치가 배정되지 않은 유일한 미구현 핵심 기능이다. "구현 우선순위"
2번("로그인 연동 및 인증 상태 관리")으로 지역 선택보다도 먼저 와야 했지만,
지금까지 로그인 없이 나머지 기능이 먼저 구현되어 있다.

현재 `ItineraryClient.tsx`는 `generateItinerary()`가 401 `AUTH_REQUIRED`를
반환하면 "로그인 기능은 준비 중입니다"라는 임시 배너와 함께 바구니 기반 로컬
미리보기를 보여주는 우회 로직(`loginPreview` phase)을 갖고 있다 — 이 계획은
그 우회를 실제 로그인 흐름으로 대체하는 작업(9단계)도 포함한다.

**실제 백엔드(`localhost:8080`) OpenAPI 스펙(`/v3/api-docs`)을 직접 확인한
결과, Kakao 로그인 API(`POST /api/v1/auth/login/kakao`)만 존재하고 Google
엔드포인트는 없다.** 이번 범위는 **Kakao만 구현**하고, Google은 백엔드 API가
생기면 별도 이슈로 진행한다.

## 백엔드 계약 (OpenAPI 직접 확인, ground truth)

```
POST   /api/v1/auth/login/kakao      { authorizationCode: string } → { accessToken, refreshToken }
POST   /api/v1/auth/token/refresh    { refreshToken: string }      → { accessToken, refreshToken }
DELETE /api/v1/auth/logout           (body 없음)                    → 200
GET    /api/v1/users/me                                             → { uid, email, nickname, profileImageUrl, provider, createdAt }
```

OpenAPI 문서에 `securitySchemes`가 명시돼 있진 않지만(springdoc 미설정),
`ItineraryClient.tsx`가 이미 관찰한 401 `AUTH_REQUIRED` 응답과 `accessToken`/
`refreshToken` 명명 규칙으로 볼 때 보호된 엔드포인트는 `Authorization: Bearer
<accessToken>` 헤더를 기대하는 표준 bearer 토큰 방식으로 가정한다.

## 토큰 저장 전략 (확정, 근거: `.agents/docs/measures-to-enhance-information-security.md:37`)

> "로컬 스토리지에 개인정보나 장기 인증 토큰을 저장하지 않는다."

- **`refreshToken`**: httpOnly, Secure, SameSite=Lax 쿠키(`pt_refresh_token`)로만
  존재 — JS가 절대 읽을 수 없음.
- **`accessToken`**: React 상태(메모리)에만 보관, 어떤 storage에도 영속화하지
  않음. 로그인 직후든 새로고침이든 **항상 같은 경로**(`POST /auth/session`)로
  발급받는다 — accessToken이 쿠키(짧은 TTL이라도)에 담기는 경로 자체가 없다.

## 아키텍처 핵심 결정 3가지

1. **로그인 직후 accessToken 전달 = 세션 부트스트랩 엔드포인트, 쿠키 아님.**
   Kakao 콜백(`route.ts`)은 `{accessToken, refreshToken}`을 받으면
   `refreshToken`만 httpOnly 쿠키로 저장하고 **accessToken은 즉시 버린 뒤**
   `next`로 redirect한다. 클라이언트(`AuthProvider`)는 마운트 시 항상
   `POST /auth/session`을 호출해 httpOnly 쿠키로 새 accessToken을 발급받는다.
   로그인 직후와 새로고침이 완전히 같은 코드 경로 — 특수 케이스 없음.

2. **CSRF `state`는 Route Handler가 설정하는 httpOnly 쿠키로 검증.**
   Client Component는 리다이렉트 전에 httpOnly 쿠키를 설정할 수 없으므로,
   "로그인 시작"도 Route Handler(`/auth/kakao/start`)로 만든다. `/login`
   페이지의 버튼은 이 Route Handler를 가리키는 **평범한 `<a>` 태그**이고,
   별도 Client Component(JS)가 필요 없다.

3. **accessToken 첨부 = 서비스 함수에 선택적 마지막 파라미터 추가, `apiFetch`는
   변경 없음.** `apiFetch`는 이미 `options.headers`를 그대로 전달하므로,
   인증이 필요한 호출부(`ItineraryClient.tsx`의 4곳: `generateItinerary`,
   `saveItinerary`, `updateBasketConditions`, `addBasketItem`)만 선택적
   `accessToken?: string` 파라미터를 받아 `Authorization` 헤더를 붙인다.
   `getItinerary`/`modifyItinerary` 등 나머지 호출부는 이번 범위에서 건드리지
   않고 후속 확인 대상으로 남긴다.

## 새 환경변수

- `NEXT_PUBLIC_KAKAO_CLIENT_ID` — Kakao REST API 키, 공개 가능
  (`.agents/docs/measures-to-enhance-information-security.md` 표 기준).
  **실제 값은 미리 만들어내지 않는다** — `.env.local`에 직접 채워 넣어야 한다.
  client secret은 프론트에 전혀 필요 없다(코드 교환은 백엔드가 수행).
- redirect_uri는 별도 env var 없이 `/auth/kakao/start`에서 요청의
  `origin`으로 동적 계산한다(`${url.origin}/auth/kakao/callback`) — 단,
  이 URL이 Kakao Developers 콘솔의 "Redirect URI"에 등록되어 있어야 한다
  (코드 변경이 아닌 수동 설정 단계).

## 쿠키 목록

| 이름 | 속성 | 설정 주체 | 용도 |
|---|---|---|---|
| `pt_oauth_state` | httpOnly, prod에서 secure, SameSite=Lax, Path=/auth, Max-Age=300 | `/auth/kakao/start` | CSRF state 검증 |
| `pt_oauth_next` | 위와 동일 | `/auth/kakao/start` | Kakao 왕복 동안 검증된 `next` 경로 보존 |
| `pt_refresh_token` | httpOnly, prod에서 secure, SameSite=Lax, Path=/auth, Max-Age=2592000(30일, 백엔드 실제 TTL 확인 전 가정치) | callback(설정) / session(갱신) / logout(삭제) | 장기 세션 |

Kakao의 콜백은 최상위 cross-site GET 네비게이션이라 `SameSite=Lax`가 쿠키를
살리는 최대 제약 수준이다.

## 진행 순서

이 작업은 `.agents/rules/branch-focus.md`가 "분리해야 할 변경"으로 명시한
"인증 플로우 수정"에 해당하므로, 기존 브랜치와 분리된 새 이슈/브랜치로
진행한다. `main` 기준으로 새 브랜치를 만든다(현재 작업 중이던 `feat/37`과는
무관한 새 작업).

## 구현 범위

### 새로 만들 파일

| 파일 | 역할 |
|---|---|
| `src/types/auth.ts` | `KakaoLoginRequest`, `LoginResponse`, `TokenRefreshRequest`, `TokenRefreshResponse`, `UserMeResponse` |
| `src/services/authService.ts` | 백엔드 4개 엔드포인트를 감싸는 얇은 함수(`itineraryService.ts`와 동일 패턴). `logoutUser`/`getCurrentUser`는 `accessToken`을 받아 `Authorization` 헤더 첨부 |
| `src/services/authService.test.ts` | URL/method/헤더/바디 검증 (`shareService.test.ts`와 동일 패턴) |
| `src/services/apiClient.test.ts` | 아래 apiClient 수정에 대한 신규 테스트 |
| `src/lib/authRedirect.ts` | `isSafeNextPath()` — `/`로 시작하고 `//`가 아닌 경로만 안전한 `next`로 허용(open redirect 방지). `/login`, `/auth/kakao/start`, `/auth/kakao/callback`이 공용으로 사용 |
| `src/lib/authRedirect.test.ts` | 안전/위험 경로 테이블 테스트 |
| `src/app/auth/kakao/start/route.ts` | `GET` — `next` 검증, `state` 생성, `pt_oauth_state`/`pt_oauth_next` 쿠키 설정, Kakao 인가 URL로 302 |
| `src/app/auth/kakao/callback/route.ts` | `GET` — `code`/`state` 검증(쿠키와 대조), `authService.loginWithKakao()` 호출, `pt_refresh_token` 설정, `next`로 302. 실패 시 `/login?error=1`로 302 |
| `src/app/auth/session/route.ts` | `POST` — httpOnly refresh 쿠키로 조용히 재로그인 + `users/me` 조회(한 요청에 묶음), 쿠키 rotate, `{accessToken, user}` JSON 반환. 쿠키 없거나 실패 시 `{accessToken: null, user: null}` |
| `src/app/auth/logout/route.ts` | `POST` — 클라이언트가 보낸 `Authorization` 헤더로 백엔드 로그아웃 호출(best-effort), `pt_refresh_token` 삭제 |
| `src/hooks/useAuth.tsx` | `AuthProvider` + `useAuth()` — `{status, accessToken, user, refresh(), logout()}`. 마운트 시 `refresh()` 자동 호출 |
| `src/hooks/useAuth.test.tsx` | `/auth/session` mock으로 상태 전이(loading→authenticated/unauthenticated), logout 호출 검증 |
| `src/components/layout/Header.tsx` | 최소 공통 헤더 — 로그인 상태에 따라 "로그인" 링크 또는 닉네임+"로그아웃" 버튼 |
| `src/components/layout/Header.test.tsx` | 3가지 상태별 렌더링 + 로그아웃 클릭 시 `logout()` 호출 검증 |
| `src/app/login/page.tsx` | 로그인 화면 (Server Component, `searchParams: Promise<{next?, error?}>`). "카카오로 로그인" 버튼은 `/auth/kakao/start`로 가는 평범한 `<a>` — 별도 Client Component 불필요 |

### 수정할 파일

| 파일 | 변경 내용 |
|---|---|
| `src/services/apiClient.ts` | `response.json()` 무조건 호출 시 `DELETE /auth/logout`처럼 빈 200 바디에서 예외 발생 — `text()` 후 빈 문자열이면 `undefined` 반환하도록 수정(기존 호출부와 하위 호환) |
| `src/app/layout.tsx` | `<AuthProvider><Header />{children}</AuthProvider>`로 감쌈 |
| `src/services/itineraryService.ts` | `generateItinerary`/`saveItinerary`에 선택적 `accessToken?` 파라미터 추가 |
| `src/services/basketService.ts` | `updateBasketConditions`/`addBasketItem`에 동일하게 추가 |
| `src/services/itineraryService.test.ts`, `basketService.test.ts` | 토큰 전달 시 헤더 포함/미전달 시 미포함 케이스 추가 |
| `src/app/itinerary/_components/ItineraryClient.tsx` | `useAuth().accessToken`을 4개 호출부에 전달. `loginPreview` 배너 문구를 "로그인하면 실제 기능을 이용할 수 있어요"로 바꾸고 `/login?next=<현재 URL>` 링크 버튼 추가 |
| `src/app/itinerary/_components/ItineraryClient.test.tsx` | 위 변경에 맞춰 배너 텍스트/링크 검증 갱신 |
| `.env.local` (사용자가 직접) | `NEXT_PUBLIC_KAKAO_CLIENT_ID` 추가 |

**9단계(ItineraryClient 배너 교체)는 범위가 좁고 되돌리기 쉽게 분리했다** —
"로그인 준비 중" 문구를 이대로 두고 싶다면 이 부분만 빼고 진행 가능하다.

## 검증

- `bun run lint`, `bunx tsc --noEmit`, `bun run build`, `bun run test`
- **단위 테스트 대상**: `apiClient.test.ts`, `authService.test.ts`,
  `authRedirect.test.ts`, `useAuth.test.tsx`, `Header.test.tsx`, 갱신된
  `itineraryService.test.ts`/`basketService.test.ts`/`ItineraryClient.test.tsx`
- **수동 검증 전용**(`docs/plan/itinerary-share.md`가 `/share/[id]/page.tsx`에
  적용한 것과 동일 기준 — 쿠키/리다이렉트 부수효과는 단위 테스트로 의미
  있게 검증 불가): `src/app/auth/**` Route Handler 4개, `/login/page.tsx`
  - 실제 Kakao 계정으로 로그인 → `next` 목적지로 정상 복귀
  - `state` 불일치/`code` 누락 → `/login?error=1`
  - 새로고침 후에도 세션 유지 확인
  - 로그아웃 → 헤더가 로그아웃 상태로 바뀌고 새로고침해도 유지
  - 시크릿 창(쿠키 없음)에서 비로그인 상태로 정상 렌더
  - 비로그인 상태로 "일정 생성하기" 클릭 → 새 링크로 `/login`을 거쳐 같은
    일정 URL로 정상 복귀
