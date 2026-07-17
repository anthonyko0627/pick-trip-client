# apiClient axios 전환 및 에러 정규화 일원화

- 이슈: [#42](https://github.com/CMU02/pick-trip-client/issues/42)
- 브랜치: `refactor/42`
- 작성일: 2026-07-17

## 배경

현재 API 호출 계층은 fetch와 axios가 혼재한다.

- `src/services/apiClient.ts`의 `apiFetch`는 fetch 기반이고, `content`/`basket`/`itinerary`/`share` 서비스와 `authService`의 일부가 이걸 쓴다.
- `authService.loginWithKakao`는 `apiFetch`를 우회해 `axios.post(\`${BASE_URL}/...\`)`를 직접 호출한다.
- `src/app/auth/kakao/callback/page.tsx`도 axios를 직접 쓴다.

`axios`는 이미 의존성에 있으므로 이번 작업은 도입이 아니라 통일이다.

가장 큰 문제는 에러 처리다. `apiFetch`는 실패 시 `` `API ${status}: ${bodyText}` `` 형태의 문자열로 `Error`를 던지고, `src/lib/errors.ts`의 `parseApiError`가 그 문자열을 정규식(`/^API \d+: ([\s\S]+)$/`)으로 다시 파싱해 JSON을 복원한다. 구조화된 응답을 문자열로 눌렀다가 되살리는 왕복이며, status code가 파싱 후 버려져 호출부가 쓸 수 없다.

## 목표

1. `apiClient`를 axios 인스턴스 export 방식으로 전환하고 `apiFetch`를 제거한다.
2. 서버 공통 에러 계약을 인터셉터 한 곳에서 `ApiError`로 정규화한다.
3. 5개 서비스를 모두 인스턴스 기반으로 옮긴다.

## 비목표

- **카카오 authorize의 백엔드 이관.** 백엔드에 authorize 리다이렉트 엔드포인트가 없어 선행 작업이 필요하다. 별도 이슈로 다룬다.
- **`src/app/auth/kakao/start/route.ts`의 `client_id` 문제.** `NEXT_PUBLIC_KAKAO_CLIENT_ID`가 미설정이라 빈 `client_id`로 authorize URL을 만드는 버그가 있으나, 위 이관이 이뤄지면 이 코드 자체가 사라지므로 지금 고치지 않는다.
- **구글 로그인.** 백엔드 엔드포인트 부재(#40)로 대기 중이다. `loginWithGoogle`은 인터페이스만 유지한 채 호출 방식만 함께 옮긴다.
- 동작 변경. 이 작업은 순수 리팩터링이다. 이 PR로 카카오 로그인이 고쳐지지는 않는다.

## 설계

### 1. `src/services/apiClient.ts`

`BASE_URL` 계산 로직은 그대로 유지한다. 브라우저에서는 빈 문자열이라 상대경로로 나가 `next.config.ts`의 `/api/:path*` rewrites가 백엔드로 프록시하고(CORS 회피), 서버에서는 백엔드로 직접 요청한다.

```ts
export const apiClient = axios.create({ baseURL: BASE_URL });

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error)),
);
```

`apiFetch`와 `BASE_URL` export는 삭제한다.

### 2. `src/lib/errors.ts`

서버 공통 에러 계약은 `{ code, message, traceId }`로 확정돼 있다 (picktrip-server MCP `getErrorContract`).

```ts
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

`parseApiError`는 다음 세 분기로 단순해진다.

1. `err instanceof ApiError` → `message`/`code`/`traceId`를 그대로 반환
2. 네트워크 오류(응답 없음) → `"네트워크 연결을 확인하고 다시 시도해주세요."`
3. 그 외 → `"오류가 발생했습니다. 잠시 후 다시 시도해주세요."`

정규식 파싱은 삭제한다. 서버가 사용자용 한국어 `message`를 주므로 그대로 노출하되, 계약에 맞지 않는 응답(비-JSON, `message` 누락)은 3번 폴백으로 떨어뜨린다.

`status`를 `ApiError`에 보존해 호출부가 401 등을 구분할 수 있게 한다. 지금 당장 쓰는 곳은 없지만 정규화의 핵심 이득이다.

### 3. 서비스 5종

각 호출부를 기계적으로 옮긴다.

```ts
// before
return apiFetch<LoginResponse>("/api/v1/auth/login/kakao", {
  method: "POST",
  body: JSON.stringify(request),
});

// after
const { data } = await apiClient.post<LoginResponse>(
  "/api/v1/auth/login/kakao",
  request,
);
return data;
```

`JSON.stringify`와 수동 `Content-Type` 설정은 axios가 처리하므로 제거한다.

`authService.loginWithKakao`의 `axios.post(\`${BASE_URL}...\`)` 직접 호출도 인스턴스 사용으로 정리한다.

**`src/app/auth/kakao/callback/page.tsx`의 `axios.post("/auth/kakao/exchange")`는 그대로 둔다.** 이건 백엔드가 아니라 같은 Next 앱의 Route Handler 호출이라 `baseURL`을 태우면 안 된다. 서버 API 경계가 아니므로 `apiClient`의 관심사가 아니다.

### 4. 테스트

`src/services/apiClient.test.ts`는 `vi.stubGlobal("fetch")`로 동작하므로 axios mock 기반으로 다시 쓴다. `authService`/`basketService`/`itineraryService`/`shareService` 테스트도 같은 이유로 mocking 계층을 교체한다.

**서비스 테스트**는 동작이 바뀌지 않으므로 assertion 의도(경로, 바디, Authorization 헤더, 응답 그대로 반환, 오류 전파)를 그대로 보존하고 mocking 계층만 바꾼다.

**`src/lib/errors.test.ts`는 예외다.** 13개 케이스 전부가 `"API 400: {...}"` 문자열 포맷을 입력으로 쓴다. 이 포맷은 `apiFetch`가 만들던 것이고 `apiFetch`가 사라지면 그런 입력은 실재하지 않는다. 케이스 5·6·12(`"Failed to fetch"`, `"NetworkError"`, `"fetch"` 키워드 매칭)는 특히 fetch 고유의 오류 메시지에 묶여 있어 axios에서는 의미가 없다. 따라서 이 13개는 보존이 아니라 **대체**한다 — `toApiError`의 계약 테스트(서버 계약 보존, 폴백, 네트워크, 비-AxiosError)와 `parseApiError`의 `ApiError` 입력 테스트가 같은 표면을 덮는다.

`contentService.test.ts`는 기존에 `apiFetch`를 mocking하지 않아 실질적으로 서비스 호출을 검증하지 않았다. 이관하면서 최소 테스트를 추가해 `src/services/**` 80% 커버리지 임계값을 지킨다.

`apiClient.test.ts`가 검증할 것:

- 정상 응답의 `data` 반환
- 빈 바디 200 응답 (`DELETE /api/v1/auth/logout`이 `Void`를 반환하므로 실제 사례)
- 서버 에러 계약 응답 → `ApiError`로 정규화 (`status`/`code`/`message`/`traceId` 보존)
- 비-JSON 에러 바디 → `ApiError`로 떨어지되 폴백 메시지
- 네트워크 오류(응답 없음) → `parseApiError`가 네트워크 문구 반환

## 검증

- `bun run lint`
- `bun run test`
- `bun run build`

## 후속 작업

- 백엔드에 카카오 authorize 리다이렉트 엔드포인트 추가 (`pick-trip-server`) → 이후 클라이언트의 `start/route.ts` 제거
- 구글 로그인 백엔드 엔드포인트 (#40)
