# apiClient axios 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fetch 기반 `apiFetch`를 axios 인스턴스로 대체하고, 서버 에러 계약을 `ApiError`로 한 곳에서 정규화한다.

**Architecture:** `src/services/apiClient.ts`가 `axios.create()` 인스턴스를 export하고, response 인터셉터가 모든 실패를 `ApiError`로 정규화해 reject한다. `src/lib/errors.ts`는 `ApiError` 클래스와 순수 함수 `toApiError`를 소유하고, `parseApiError`는 `ApiError`를 읽어 UI용 `ParsedApiError`로 바꾼다. 5개 서비스는 인스턴스를 직접 호출한다.

**Tech Stack:** TypeScript 5, axios 1.18, Vitest 4, Biome 2.5, Bun

## Global Constraints

- 순수 리팩터링이다. 런타임 동작을 바꾸지 않는다.
- `ParsedApiError`의 형태(`{ message, code?, traceId? }`)를 바꾸지 않는다. UI 6개 파일(`useItineraryEditor.ts`, `SavedItinerariesList.tsx`, `ItineraryClient.tsx`, `ShareButton.tsx`, `AlternativePlacePicker.tsx`, `ItineraryResult.tsx`)이 이 타입에만 의존하므로 **UI 파일은 이 계획에서 수정하지 않는다.**
- 폴백 메시지 문구는 정확히 이 값을 유지한다:
  - 일반: `오류가 발생했습니다. 잠시 후 다시 시도해주세요.`
  - 네트워크: `네트워크 연결을 확인하고 다시 시도해주세요.`
- 서버 공통 에러 계약은 `{ code, message, traceId }`다.
- **모든 태스크는 끝났을 때 `bun run test`가 전부 통과해야 한다.** 그래서 Task 1~7은 `apiFetch`를 남겨두고, Task 8에서 마지막으로 삭제한다.
- 커버리지 임계값을 지킨다: `src/lib/**`와 `src/services/**`는 lines/functions/statements 80%, branches 70%.
- `src/app/auth/kakao/callback/page.tsx`의 `axios.post("/auth/kakao/exchange")`는 **수정하지 않는다.** 백엔드가 아니라 같은 앱의 Route Handler 호출이라 `baseURL`을 태우면 안 된다.
- 명령어는 워크트리 루트(`E:/project/pick-trip-client/.claude/worktrees/refactor-42`)에서 실행한다.

## File Structure

| 파일 | 책임 | 태스크 |
| --- | --- | --- |
| `src/lib/errors.ts` | `ApiError` 클래스, `toApiError` 정규화, `parseApiError` UI 변환 | 1, 8 |
| `src/lib/errors.test.ts` | 위 3종의 단위 테스트 | 1, 8 |
| `src/services/apiClient.ts` | `BASE_URL` 계산, axios 인스턴스, 인터셉터 등록 | 2, 8 |
| `src/services/apiClient.test.ts` | 인스턴스 설정과 인터셉터 통합 테스트 | 2, 8 |
| `src/services/authService.ts` | 인증 API 4종 | 3 |
| `src/services/contentService.ts` | 콘텐츠 API 2종 | 4 |
| `src/services/basketService.ts` | 바구니 API 2종 | 5 |
| `src/services/itineraryService.ts` | 일정 API 4종 | 6 |
| `src/services/shareService.ts` | 공유 API 2종 | 7 |

`toApiError`를 `apiClient.ts`가 아니라 `lib/errors.ts`에 두는 이유: 순수 함수라 인터셉터를 거치지 않고 직접 단위 테스트할 수 있고, 에러 계약 지식이 `errors.ts` 한 곳에 모인다.

---

### Task 1: `ApiError`와 `toApiError`를 `lib/errors.ts`에 추가

`apiFetch`가 아직 살아있으므로 `parseApiError`의 기존 문자열 파싱 분기는 **이 태스크에서 유지한다.** Task 8에서 제거한다.

**Files:**
- Modify: `src/lib/errors.ts`
- Test: `src/lib/errors.test.ts`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - `export class ApiError extends Error` — 생성자 `(status: number, message: string, code?: string, traceId?: string)`, 읽기 전용 속성 `status`/`code`/`traceId`, `name === "ApiError"`
  - `export function toApiError(error: unknown): ApiError`
  - `export function parseApiError(err: unknown): ParsedApiError` (기존 유지)
  - `export interface ParsedApiError { message: string; code?: string; traceId?: string }` (기존 유지)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/lib/errors.test.ts`의 **맨 위 import를 교체**하고, 기존 `describe("parseApiError", ...)` 블록 **앞에** 아래 두 블록을 추가한다. 기존 13개 케이스는 그대로 둔다.

```ts
import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, parseApiError, toApiError } from "./errors";

function axiosErrorWithResponse(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
    status,
    statusText: "",
    data,
    headers: new AxiosHeaders(),
    config,
  });
}

function axiosNetworkError(): AxiosError {
  return new AxiosError("Network Error", "ERR_NETWORK", {
    headers: new AxiosHeaders(),
  });
}

describe("toApiError", () => {
  it("서버 에러 계약(code/message/traceId)을 status와 함께 보존한다", () => {
    const result = toApiError(
      axiosErrorWithResponse(401, {
        code: "AUTH_REQUIRED",
        message: "로그인이 필요합니다.",
        traceId: "trace-1",
      }),
    );

    expect(result).toBeInstanceOf(ApiError);
    expect(result.status).toBe(401);
    expect(result.message).toBe("로그인이 필요합니다.");
    expect(result.code).toBe("AUTH_REQUIRED");
    expect(result.traceId).toBe("trace-1");
  });

  it("message만 있는 응답은 code/traceId를 undefined로 둔다", () => {
    const result = toApiError(
      axiosErrorWithResponse(404, { message: "일정을 찾을 수 없습니다." }),
    );

    expect(result.status).toBe(404);
    expect(result.message).toBe("일정을 찾을 수 없습니다.");
    expect(result.code).toBeUndefined();
    expect(result.traceId).toBeUndefined();
  });

  it("계약에 맞지 않는 바디(비-JSON 문자열)는 폴백 메시지를 쓰되 status는 보존한다", () => {
    const result = toApiError(axiosErrorWithResponse(400, "Bad Request"));

    expect(result.status).toBe(400);
    expect(result.message).toBe("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    expect(result.code).toBeUndefined();
  });

  it("message가 문자열이 아니면 폴백 메시지를 쓴다", () => {
    const result = toApiError(axiosErrorWithResponse(400, { message: 123 }));

    expect(result.message).toBe("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  });

  it("응답이 없는 네트워크 오류는 status 0과 네트워크 메시지로 정규화한다", () => {
    const result = toApiError(axiosNetworkError());

    expect(result.status).toBe(0);
    expect(result.message).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
  });

  it("AxiosError가 아닌 값은 status 0과 폴백 메시지로 정규화한다", () => {
    const result = toApiError(new Error("boom"));

    expect(result.status).toBe(0);
    expect(result.message).toBe("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
  });
});

describe("parseApiError - ApiError 입력", () => {
  it("ApiError의 message/code/traceId를 그대로 옮긴다", () => {
    const err = new ApiError(401, "로그인이 필요합니다.", "AUTH_REQUIRED", "trace-1");

    expect(parseApiError(err)).toEqual({
      message: "로그인이 필요합니다.",
      code: "AUTH_REQUIRED",
      traceId: "trace-1",
    });
  });

  it("네트워크 ApiError는 네트워크 메시지를 유지한다", () => {
    const err = new ApiError(0, "네트워크 연결을 확인하고 다시 시도해주세요.");

    expect(parseApiError(err)).toEqual({
      message: "네트워크 연결을 확인하고 다시 시도해주세요.",
      code: undefined,
      traceId: undefined,
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/lib/errors.test.ts`
Expected: FAIL — `toApiError`와 `ApiError`가 export되지 않아 import 에러가 난다.

- [ ] **Step 3: 최소 구현**

`src/lib/errors.ts`를 아래로 교체한다. `parseApiError`의 기존 문자열 분기는 `ApiError` 분기 **뒤에** 그대로 남긴다.

```ts
import { AxiosError } from "axios";

export interface ParsedApiError {
  message: string;
  code?: string;
  traceId?: string;
}

const FALLBACK_MESSAGE = "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
const NETWORK_MESSAGE = "네트워크 연결을 확인하고 다시 시도해주세요.";

// status 0은 "서버 응답이 없음"(네트워크 오류 등)을 뜻한다.
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly traceId?: string;

  constructor(
    status: number,
    message: string,
    code?: string,
    traceId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

interface ErrorContractBody {
  code?: unknown;
  message?: unknown;
  traceId?: unknown;
}

/** axios가 던진 오류를 서버 공통 에러 계약({ code, message, traceId })에 맞춰 ApiError로 정규화한다. */
export function toApiError(error: unknown): ApiError {
  if (!(error instanceof AxiosError)) {
    return new ApiError(0, FALLBACK_MESSAGE);
  }

  const response = error.response;
  if (!response) {
    return new ApiError(0, NETWORK_MESSAGE);
  }

  const body: ErrorContractBody =
    typeof response.data === "object" && response.data !== null
      ? (response.data as ErrorContractBody)
      : {};

  return new ApiError(
    response.status,
    typeof body.message === "string" ? body.message : FALLBACK_MESSAGE,
    typeof body.code === "string" ? body.code : undefined,
    typeof body.traceId === "string" ? body.traceId : undefined,
  );
}

export function parseApiError(err: unknown): ParsedApiError {
  if (err instanceof ApiError) {
    return { message: err.message, code: err.code, traceId: err.traceId };
  }

  // TODO(Task 8): apiFetch 제거 후 아래 문자열 파싱 분기를 삭제한다.
  if (err instanceof Error) {
    // apiFetch throw 형식: "API 4xx: <body-text>"
    const bodyMatch = err.message.match(/^API \d+: ([\s\S]+)$/);
    if (bodyMatch) {
      try {
        const parsed = JSON.parse(bodyMatch[1]) as ErrorContractBody;
        if (typeof parsed.message === "string") {
          return {
            message: parsed.message,
            code: typeof parsed.code === "string" ? parsed.code : undefined,
            traceId:
              typeof parsed.traceId === "string" ? parsed.traceId : undefined,
          };
        }
      } catch {
        // body가 JSON이 아닌 경우 — fallthrough
      }
    }
    if (
      err.message.includes("Failed to fetch") ||
      err.message.includes("NetworkError") ||
      err.message.includes("fetch")
    ) {
      return { message: NETWORK_MESSAGE };
    }
  }

  return { message: FALLBACK_MESSAGE };
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/lib/errors.test.ts`
Expected: PASS — 신규 8케이스 + 기존 13케이스 = 21개 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/lib/errors.ts src/lib/errors.test.ts
git commit -m "feat(errors): ApiError와 toApiError 정규화 함수 추가

서버 공통 에러 계약(code/message/traceId)을 status와 함께 보존하는
ApiError를 도입하고 parseApiError가 이를 읽도록 한다.
apiFetch가 남아있는 동안은 기존 문자열 파싱 분기도 유지한다.

Refs #42"
```

---

### Task 2: `apiClient`에 axios 인스턴스와 인터셉터 추가

`apiFetch`는 이 태스크에서 **삭제하지 않는다.** 다른 서비스가 아직 쓰고 있다.

**Files:**
- Modify: `src/services/apiClient.ts`
- Test: `src/services/apiClient.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ApiError`, `toApiError` (`@/lib/errors`)
- Produces:
  - `export const apiClient: AxiosInstance` — `baseURL`이 `BASE_URL`이고, 모든 실패를 `ApiError`로 reject하는 response 인터셉터가 등록돼 있다
  - `export const BASE_URL: string` (기존 유지, Task 8에서 삭제)
  - `export async function apiFetch<T>(url, options): Promise<T>` (기존 유지, Task 8에서 삭제)

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/apiClient.test.ts`의 기존 `describe("apiFetch", ...)` 블록은 그대로 두고, 파일 **맨 위 import를 교체**한 뒤 파일 **끝에** 아래를 추가한다.

커스텀 adapter를 끼워 실제 인터셉터를 태운다. adapter는 axios의 `settle`을 대신하지 않으므로, 실패 케이스는 adapter가 직접 `AxiosError`를 reject한다.

```ts
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import { apiClient, apiFetch } from "./apiClient";

describe("apiClient", () => {
  const originalAdapter = apiClient.defaults.adapter;

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  it("성공 응답의 data를 그대로 돌려준다", async () => {
    apiClient.defaults.adapter = async (config) => ({
      data: { id: "1" },
      status: 200,
      statusText: "OK",
      headers: new AxiosHeaders(),
      config,
    });

    const response = await apiClient.get<{ id: string }>("/api/v1/example");

    expect(response.data).toEqual({ id: "1" });
  });

  it("서버 에러 계약 응답을 ApiError로 정규화해 reject한다", async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, {}, {
        status: 401,
        statusText: "Unauthorized",
        data: {
          code: "AUTH_REQUIRED",
          message: "로그인이 필요합니다.",
          traceId: "trace-1",
        },
        headers: new AxiosHeaders(),
        config,
      });
    };

    const error = await apiClient.get("/api/v1/example").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("AUTH_REQUIRED");
    expect(error.message).toBe("로그인이 필요합니다.");
    expect(error.traceId).toBe("trace-1");
  });

  it("네트워크 오류(응답 없음)도 ApiError로 정규화해 reject한다", async () => {
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError("Network Error", "ERR_NETWORK", config);
    };

    const error = await apiClient.get("/api/v1/example").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toBe("네트워크 연결을 확인하고 다시 시도해주세요.");
  });
});
```

> 기존 `describe("apiFetch", ...)` 블록의 `vi.stubGlobal("fetch")` 설정은 손대지 않는다.

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/services/apiClient.test.ts`
Expected: FAIL — `apiClient`가 export되지 않아 import 에러가 난다.

- [ ] **Step 3: 최소 구현**

`src/services/apiClient.ts`에서 기존 `BASE_URL`과 `apiFetch`는 그대로 두고, `BASE_URL` 선언 **아래에** 다음을 추가한다. 파일 맨 위에 import도 추가한다.

```ts
import axios from "axios";
import { toApiError } from "@/lib/errors";
```

```ts
export const apiClient = axios.create({ baseURL: BASE_URL });

// 모든 실패를 서버 공통 에러 계약에 맞춘 ApiError로 정규화해, 호출부가
// axios 세부 구조를 몰라도 code/message/traceId/status를 읽을 수 있게 한다.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/services/apiClient.test.ts`
Expected: PASS — 신규 3케이스 + 기존 apiFetch 3케이스 = 6개 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/services/apiClient.ts src/services/apiClient.test.ts
git commit -m "feat(services): apiClient에 axios 인스턴스와 에러 정규화 인터셉터 추가

response 인터셉터가 모든 실패를 ApiError로 정규화한다.
서비스 이관이 끝날 때까지 apiFetch는 함께 유지한다.

Refs #42"
```

---

### Task 3: `authService`를 `apiClient`로 이관

**Files:**
- Modify: `src/services/authService.ts`
- Test: `src/services/authService.test.ts`

**Interfaces:**
- Consumes: Task 2의 `apiClient`
- Produces: 시그니처 변경 없음 — `loginWithKakao(request: KakaoLoginRequest): Promise<LoginResponse>`, `loginWithGoogle(request: GoogleLoginRequest): Promise<LoginResponse>`, `refreshAccessToken(request: TokenRefreshRequest): Promise<TokenRefreshResponse>`, `logoutUser(accessToken?: string): Promise<void>`, `getCurrentUser(accessToken: string): Promise<UserMeResponse>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/authService.test.ts`를 아래로 **전체 교체**한다. 기존 4개 describe의 검증 의도(경로, 바디, Authorization 헤더, 응답 그대로 반환)를 그대로 옮긴다.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  LoginResponse,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";
import { apiClient } from "./apiClient";
import {
  getCurrentUser,
  loginWithKakao,
  logoutUser,
  refreshAccessToken,
} from "./authService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockDelete = vi.mocked(apiClient.delete);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginWithKakao", () => {
  const mockResponse: LoginResponse = {
    accessToken: "access-1",
    refreshToken: "refresh-1",
  };

  it("POST /api/v1/auth/login/kakao를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await loginWithKakao({ authorizationCode: "code-1" });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/login/kakao", {
      authorizationCode: "code-1",
    });
    expect(result).toEqual(mockResponse);
  });
});

describe("refreshAccessToken", () => {
  const mockResponse: TokenRefreshResponse = {
    accessToken: "access-2",
    refreshToken: "refresh-2",
  };

  it("POST /api/v1/auth/token/refresh를 올바른 body로 호출하고 응답을 그대로 반환", async () => {
    mockPost.mockResolvedValueOnce({ data: mockResponse });

    const result = await refreshAccessToken({ refreshToken: "refresh-1" });

    expect(mockPost).toHaveBeenCalledWith("/api/v1/auth/token/refresh", {
      refreshToken: "refresh-1",
    });
    expect(result).toEqual(mockResponse);
  });
});

describe("logoutUser", () => {
  it("accessToken이 있으면 Authorization 헤더를 붙여 DELETE /api/v1/auth/logout을 호출", async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await logoutUser("access-1");

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/auth/logout", {
      headers: { Authorization: "Bearer access-1" },
    });
  });

  it("accessToken이 없어도 호출은 진행된다(헤더 없이)", async () => {
    mockDelete.mockResolvedValueOnce({ data: undefined });

    await logoutUser();

    expect(mockDelete).toHaveBeenCalledWith("/api/v1/auth/logout", {
      headers: undefined,
    });
  });
});

describe("getCurrentUser", () => {
  const mockResponse: UserMeResponse = {
    uid: "uid-1",
    email: "user@example.com",
    nickname: "김여행",
    profileImageUrl: "https://example.com/profile.png",
    provider: "KAKAO",
    createdAt: "2026-01-01T00:00:00Z",
  };

  it("Authorization 헤더를 붙여 GET /api/v1/users/me를 호출하고 응답을 그대로 반환", async () => {
    mockGet.mockResolvedValueOnce({ data: mockResponse });

    const result = await getCurrentUser("access-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/users/me", {
      headers: { Authorization: "Bearer access-1" },
    });
    expect(result).toEqual(mockResponse);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/services/authService.test.ts`
Expected: FAIL — `authService`가 아직 `apiFetch`/생짜 `axios`를 쓰므로 `mockPost`가 호출되지 않는다.

- [ ] **Step 3: 최소 구현**

`src/services/authService.ts`를 아래로 **전체 교체**한다.

```ts
import { apiClient } from "@/services/apiClient";
import type {
  GoogleLoginRequest,
  KakaoLoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  UserMeResponse,
} from "@/types/auth";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export async function loginWithKakao(
  request: KakaoLoginRequest,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    "/api/v1/auth/login/kakao",
    request,
  );
  return data;
}

// 백엔드에 /api/v1/auth/login/google이 아직 없어(이슈 #40) 인터페이스만 우선 정의.
// 백엔드 준비 후 실제 응답 스키마가 LoginResponse와 다르면 이 함수만 조정한다.
export async function loginWithGoogle(
  request: GoogleLoginRequest,
): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(
    "/api/v1/auth/login/google",
    request,
  );
  return data;
}

export async function refreshAccessToken(
  request: TokenRefreshRequest,
): Promise<TokenRefreshResponse> {
  const { data } = await apiClient.post<TokenRefreshResponse>(
    "/api/v1/auth/token/refresh",
    request,
  );
  return data;
}

export async function logoutUser(accessToken?: string): Promise<void> {
  await apiClient.delete<void>("/api/v1/auth/logout", {
    headers: authHeaders(accessToken),
  });
}

export async function getCurrentUser(
  accessToken: string,
): Promise<UserMeResponse> {
  const { data } = await apiClient.get<UserMeResponse>("/api/v1/users/me", {
    headers: authHeaders(accessToken),
  });
  return data;
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/services/authService.test.ts`
Expected: PASS — 5케이스 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/services/authService.ts src/services/authService.test.ts
git commit -m "refactor(auth): authService를 apiClient 인스턴스로 이관

loginWithKakao가 BASE_URL을 수동 결합해 axios를 직접 호출하던 것을
apiClient 사용으로 통일한다.

Refs #42"
```

---

### Task 4: `contentService`를 `apiClient`로 이관

기존에 `contentService.test.ts`는 `apiFetch`를 mocking하지 않는다(0회 참조). 이관과 함께 최소 테스트를 추가해 `src/services/**` 80% 커버리지 임계값을 지킨다.

**Files:**
- Modify: `src/services/contentService.ts`
- Test: `src/services/contentService.test.ts`

**Interfaces:**
- Consumes: Task 2의 `apiClient`
- Produces: 시그니처 변경 없음 — `getContents(params: GetContentsParams): Promise<ContentsResponse>`, `getContentById(id: string): Promise<ContentDetail>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/contentService.test.ts` **파일 맨 위에** 아래 블록을 추가한다. 기존 테스트가 있다면 그대로 둔다.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./apiClient";
import { getContentById, getContents } from "./contentService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);

describe("getContents (apiClient 이관)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("지역마다 GET /api/v1/contents를 호출하고 결과를 합쳐 반환한다", async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          totalCount: 1,
          items: [
            {
              contentId: "c-1",
              title: "쌍계사",
              address: "하동군",
              firstImage: "https://example.com/1.jpg",
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          totalCount: 2,
          items: [
            {
              contentId: "c-2",
              title: "부석사",
              address: "영주시",
              firstImage: "",
            },
          ],
        },
      });

    const result = await getContents({
      regions: ["HADONG", "YEONGJU"],
      startDate: "2026-08-01",
      nights: 1,
    });

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=1",
    );
    expect(result.total).toBe(3);
    expect(result.contents).toEqual([
      {
        id: "c-1",
        name: "쌍계사",
        region: "HADONG",
        imageUrl: "https://example.com/1.jpg",
        address: "하동군",
      },
      {
        id: "c-2",
        name: "부석사",
        region: "YEONGJU",
        imageUrl: null,
        address: "영주시",
      },
    ]);
  });

  it("companions가 있으면 쿼리에 콤마로 이어 붙인다", async () => {
    mockGet.mockResolvedValueOnce({ data: { totalCount: 0, items: [] } });

    await getContents({
      regions: ["HADONG"],
      startDate: "2026-08-01",
      nights: 2,
      companions: ["FAMILY", "PET"],
    });

    expect(mockGet).toHaveBeenCalledWith(
      "/api/v1/contents?region=HADONG&startDate=2026-08-01&nights=2&companions=FAMILY%2CPET",
    );
  });
});

describe("getContentById (apiClient 이관)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/contents/{id}를 호출하고 응답을 그대로 반환한다", async () => {
    const detail = { id: "c-1", name: "쌍계사" };
    mockGet.mockResolvedValueOnce({ data: detail });

    const result = await getContentById("c-1");

    expect(mockGet).toHaveBeenCalledWith("/api/v1/contents/c-1");
    expect(result).toEqual(detail);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/services/contentService.test.ts`
Expected: FAIL — `contentService`가 아직 `apiFetch`를 쓰므로 `mockGet`이 호출되지 않는다.

- [ ] **Step 3: 최소 구현**

`src/services/contentService.ts`에서 import를 바꾸고 두 호출부를 교체한다.

import 교체:
```ts
import { apiClient } from "./apiClient";
```

`getContents` 안의 `return apiFetch<RawContentsResponse>(...)`를 교체:
```ts
      return apiClient
        .get<RawContentsResponse>(`/api/v1/contents?${query.toString()}`)
        .then((res) => res.data);
```

`getContentById` 전체를 교체:
```ts
export async function getContentById(id: string): Promise<ContentDetail> {
  const { data } = await apiClient.get<ContentDetail>(`/api/v1/contents/${id}`);
  return data;
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/services/contentService.test.ts`
Expected: PASS — 신규 3케이스 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/services/contentService.ts src/services/contentService.test.ts
git commit -m "refactor(content): contentService를 apiClient 인스턴스로 이관

이관과 함께 누락돼 있던 getContents/getContentById 단위 테스트를 추가한다.

Refs #42"
```

---

### Task 5: `basketService`를 `apiClient`로 이관

**Files:**
- Modify: `src/services/basketService.ts`
- Test: `src/services/basketService.test.ts`

**Interfaces:**
- Consumes: Task 2의 `apiClient`
- Produces: 시그니처 변경 없음 — `updateBasketConditions(request, accessToken?)`, `addBasketItem(request, accessToken?)`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/basketService.test.ts`의 mocking 블록을 아래로 교체한다. `vi.mock("./apiClient")`와 `vi.mocked(apiClientModule.apiFetch)` 참조를 모두 없앤다.

```ts
import { apiClient } from "./apiClient";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
```

기존 케이스의 assertion을 아래 형태로 옮긴다. 검증 의도(경로, 바디, Authorization 헤더, 응답 그대로 반환, 오류 전파)는 유지한다.

```ts
// updateBasketConditions 성공 케이스
mockPut.mockResolvedValueOnce({ data: mockResponse });
const result = await updateBasketConditions(request, "access-1");
expect(mockPut).toHaveBeenCalledWith("/api/v1/baskets/conditions", request, {
  headers: { Authorization: "Bearer access-1" },
});
expect(result).toEqual(mockResponse);

// addBasketItem 성공 케이스
mockPost.mockResolvedValueOnce({ data: mockResponse });
const result = await addBasketItem(request, "access-1");
expect(mockPost).toHaveBeenCalledWith("/api/v1/baskets/items", request, {
  headers: { Authorization: "Bearer access-1" },
});
expect(result).toEqual(mockResponse);

// accessToken 없는 케이스
expect(mockPost).toHaveBeenCalledWith("/api/v1/baskets/items", request, {
  headers: undefined,
});

// 오류 전파 케이스 — 문자열 Error 대신 ApiError를 쓴다
const testError = new ApiError(409, "이미 바구니에 담은 콘텐츠입니다.", "BASKET_ITEM_DUPLICATE");
mockPost.mockRejectedValueOnce(testError);
await expect(addBasketItem(request)).rejects.toThrow(testError);
```

`ApiError`를 쓰는 케이스가 있으면 import를 추가한다:
```ts
import { ApiError } from "@/lib/errors";
```

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/services/basketService.test.ts`
Expected: FAIL — `basketService`가 아직 `apiFetch`를 쓰므로 `mockPut`/`mockPost`가 호출되지 않는다.

- [ ] **Step 3: 최소 구현**

`src/services/basketService.ts`를 아래로 **전체 교체**한다.

```ts
import { apiClient } from "@/services/apiClient";
import type {
  AddBasketItemRequest,
  BasketItemResponse,
  BasketResponse,
  UpdateBasketConditionsRequest,
} from "@/types/basket";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

export async function updateBasketConditions(
  request: UpdateBasketConditionsRequest,
  accessToken?: string,
): Promise<BasketResponse> {
  const { data } = await apiClient.put<BasketResponse>(
    "/api/v1/baskets/conditions",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
}

export async function addBasketItem(
  request: AddBasketItemRequest,
  accessToken?: string,
): Promise<BasketItemResponse> {
  const { data } = await apiClient.post<BasketItemResponse>(
    "/api/v1/baskets/items",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/services/basketService.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/services/basketService.ts src/services/basketService.test.ts
git commit -m "refactor(basket): basketService를 apiClient 인스턴스로 이관

Refs #42"
```

---

### Task 6: `itineraryService`를 `apiClient`로 이관

**Files:**
- Modify: `src/services/itineraryService.ts`
- Test: `src/services/itineraryService.test.ts`

**Interfaces:**
- Consumes: Task 2의 `apiClient`
- Produces: 시그니처 변경 없음 — `generateItinerary(accessToken?)`, `saveItinerary(request, accessToken?)`, `getItinerary(itineraryId)`, `modifyItinerary(itineraryId, request)`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/itineraryService.test.ts`의 mocking 블록을 Task 5와 같은 형태로 교체한다.

```ts
import { apiClient } from "./apiClient";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPatch = vi.mocked(apiClient.patch);
```

기존 7개 참조의 assertion을 아래 형태로 옮긴다.

```ts
// generateItinerary — 바디 없음. axios.post의 2번째 인자는 undefined다.
mockPost.mockResolvedValueOnce({ data: mockResponse });
const result = await generateItinerary("access-1");
expect(mockPost).toHaveBeenCalledWith("/api/v1/itineraries/generate", undefined, {
  headers: { Authorization: "Bearer access-1" },
});

// saveItinerary
mockPost.mockResolvedValueOnce({ data: mockResponse });
const result = await saveItinerary(request, "access-1");
expect(mockPost).toHaveBeenCalledWith("/api/v1/itineraries", request, {
  headers: { Authorization: "Bearer access-1" },
});

// getItinerary
mockGet.mockResolvedValueOnce({ data: mockResponse });
const result = await getItinerary("itinerary-1");
expect(mockGet).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1");

// modifyItinerary
mockPatch.mockResolvedValueOnce({ data: mockResponse });
const result = await modifyItinerary("itinerary-1", request);
expect(mockPatch).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1", request);

// 오류 전파 케이스가 있으면 ApiError로 바꾼다
const testError = new ApiError(408, "일정 생성에 실패했습니다. 다시 시도해주세요.", "ITINERARY_GENERATION_TIMEOUT");
mockPost.mockRejectedValueOnce(testError);
await expect(generateItinerary()).rejects.toThrow(testError);
```

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/services/itineraryService.test.ts`
Expected: FAIL — mock 호출이 일어나지 않는다.

- [ ] **Step 3: 최소 구현**

`src/services/itineraryService.ts`를 아래로 **전체 교체**한다.

```ts
import { apiClient } from "@/services/apiClient";
import type {
  ItineraryGenerateResponse,
  ItineraryResponse,
  SaveItineraryRequest,
} from "@/types/itinerary";

function authHeaders(accessToken?: string) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
}

// generate는 요청 바디를 받지 않는다 — 서버에 저장된 사용자의 바구니/조건을 읽어 생성한다.
// 호출 전에 basketService로 바구니/조건을 서버에 반영해야 한다.
export async function generateItinerary(
  accessToken?: string,
): Promise<ItineraryGenerateResponse> {
  const { data } = await apiClient.post<ItineraryGenerateResponse>(
    "/api/v1/itineraries/generate",
    undefined,
    { headers: authHeaders(accessToken) },
  );
  return data;
}

export async function saveItinerary(
  request: SaveItineraryRequest,
  accessToken?: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.post<ItineraryResponse>(
    "/api/v1/itineraries",
    request,
    { headers: authHeaders(accessToken) },
  );
  return data;
}

export async function getItinerary(
  itineraryId: string,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.get<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
  );
  return data;
}

export async function modifyItinerary(
  itineraryId: string,
  request: SaveItineraryRequest,
): Promise<ItineraryResponse> {
  const { data } = await apiClient.patch<ItineraryResponse>(
    `/api/v1/itineraries/${itineraryId}`,
    request,
  );
  return data;
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/services/itineraryService.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/services/itineraryService.ts src/services/itineraryService.test.ts
git commit -m "refactor(itinerary): itineraryService를 apiClient 인스턴스로 이관

Refs #42"
```

---

### Task 7: `shareService`를 `apiClient`로 이관

**Files:**
- Modify: `src/services/shareService.ts`
- Test: `src/services/shareService.test.ts`

**Interfaces:**
- Consumes: Task 2의 `apiClient`
- Produces: 시그니처 변경 없음 — `createShare(itineraryId: string): Promise<ShareCreateResponse>`, `getSharedItinerary(token: string): Promise<SharedItineraryResponse>`

- [ ] **Step 1: 실패하는 테스트 작성**

`src/services/shareService.test.ts`에서 import와 mocking 블록을 교체하고, 4개 케이스의 assertion을 옮긴다.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";
import type {
  ShareCreateResponse,
  SharedItineraryResponse,
} from "@/types/itinerary";
import { apiClient } from "./apiClient";
import { createShare, getSharedItinerary } from "./shareService";

vi.mock("./apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
```

각 케이스의 body를 아래로 바꾼다. `mockResponse` 상수 2개는 기존 값을 그대로 유지한다.

```ts
// createShare 성공
mockPost.mockResolvedValueOnce({ data: mockResponse });
const result = await createShare("itinerary-1");
expect(mockPost).toHaveBeenCalledWith("/api/v1/itineraries/itinerary-1/share");
expect(result).toEqual(mockResponse);

// createShare 오류 전파
const testError = new ApiError(401, "로그인이 필요합니다.", "AUTH_REQUIRED");
mockPost.mockRejectedValueOnce(testError);
await expect(createShare("itinerary-1")).rejects.toThrow(testError);

// getSharedItinerary 성공
mockGet.mockResolvedValueOnce({ data: mockResponse });
const result = await getSharedItinerary("share-token-1");
expect(mockGet).toHaveBeenCalledWith("/api/v1/share/share-token-1");
expect(result).toEqual(mockResponse);

// getSharedItinerary 오류 전파(유효하지 않은 토큰 등)
const testError = new ApiError(
  404,
  "유효하지 않은 공유 링크입니다.",
  "SHARE_ITINERARY_NOT_FOUND",
);
mockGet.mockRejectedValueOnce(testError);
await expect(getSharedItinerary("invalid-token")).rejects.toThrow(testError);
```

- [ ] **Step 2: 실패 확인**

Run: `bun run test src/services/shareService.test.ts`
Expected: FAIL — mock 호출이 일어나지 않는다.

- [ ] **Step 3: 최소 구현**

`src/services/shareService.ts`를 아래로 **전체 교체**한다.

```ts
import { apiClient } from "@/services/apiClient";
import type {
  ShareCreateResponse,
  SharedItineraryResponse,
} from "@/types/itinerary";

export async function createShare(
  itineraryId: string,
): Promise<ShareCreateResponse> {
  const { data } = await apiClient.post<ShareCreateResponse>(
    `/api/v1/itineraries/${itineraryId}/share`,
  );
  return data;
}

export async function getSharedItinerary(
  token: string,
): Promise<SharedItineraryResponse> {
  const { data } = await apiClient.get<SharedItineraryResponse>(
    `/api/v1/share/${token}`,
  );
  return data;
}
```

- [ ] **Step 4: 통과 확인**

Run: `bun run test src/services/shareService.test.ts`
Expected: PASS — 4케이스 통과.

- [ ] **Step 5: 커밋**

```bash
git add src/services/shareService.ts src/services/shareService.test.ts
git commit -m "refactor(share): shareService를 apiClient 인스턴스로 이관

Refs #42"
```

---

### Task 8: `apiFetch` 제거와 레거시 파싱 분기 정리

마지막 소비자가 사라졌으므로 `apiFetch`, `BASE_URL` export, `parseApiError`의 문자열 파싱 분기를 삭제한다.

**Files:**
- Modify: `src/services/apiClient.ts`
- Modify: `src/services/apiClient.test.ts`
- Modify: `src/lib/errors.ts`
- Modify: `src/lib/errors.test.ts`

**Interfaces:**
- Consumes: Task 1~7의 결과
- Produces:
  - `src/services/apiClient.ts`는 `apiClient`만 export한다. `apiFetch`와 `BASE_URL` export는 사라진다.
  - `parseApiError`는 `ApiError` 분기와 폴백 분기만 갖는다.

- [ ] **Step 1: 잔존 사용처 확인**

Run: `grep -rn "apiFetch" src/`
Expected: `src/services/apiClient.ts`와 `src/services/apiClient.test.ts`에만 남아 있다. 다른 파일이 나오면 그 파일을 먼저 이관한다.

Run: `grep -rn "BASE_URL" src/`
Expected: `src/services/apiClient.ts`에만 남아 있다.

- [ ] **Step 2: `apiFetch` 삭제**

`src/services/apiClient.ts`를 아래로 **전체 교체**한다. `BASE_URL`은 모듈 내부 상수로 강등한다.

```ts
import axios from "axios";
import { toApiError } from "@/lib/errors";

// 브라우저에서는 same-origin 상대 경로로 요청해 next.config.ts의 rewrites가
// 백엔드로 프록시하도록 하고(CORS 회피), 서버(Server Component 등)에서는
// Next.js 서버를 거치지 않고 백엔드로 직접 요청한다.
const BASE_URL =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080")
    : "";

export const apiClient = axios.create({ baseURL: BASE_URL });

// 모든 실패를 서버 공통 에러 계약에 맞춘 ApiError로 정규화해, 호출부가
// axios 세부 구조를 몰라도 code/message/traceId/status를 읽을 수 있게 한다.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);
```

`src/services/apiClient.test.ts`에서 `describe("apiFetch", ...)` 블록 전체와 `apiFetch` import, `vi.stubGlobal("fetch")` 관련 `beforeEach`/`afterEach`를 삭제한다. Task 2에서 추가한 `describe("apiClient", ...)` 블록만 남긴다.

- [ ] **Step 3: 레거시 파싱 분기 삭제**

`src/lib/errors.ts`의 `parseApiError`를 아래로 교체한다. `TODO(Task 8)` 주석과 문자열 파싱 분기를 함께 삭제한다.

```ts
export function parseApiError(err: unknown): ParsedApiError {
  if (err instanceof ApiError) {
    return { message: err.message, code: err.code, traceId: err.traceId };
  }
  return { message: FALLBACK_MESSAGE };
}
```

`src/lib/errors.test.ts`에서 기존 `describe("parseApiError", ...)` 블록의 13개 케이스를 삭제한다. 전부 `"API 400: {...}"` 문자열 포맷에 의존하는데, 그 포맷을 만들던 `apiFetch`가 사라졌으므로 검증 대상이 없다. 이 계약은 Task 1에서 추가한 `describe("toApiError", ...)`와 `describe("parseApiError - ApiError 입력", ...)`이 대체한다.

삭제 후 `parseApiError`의 폴백 경로를 지키기 위해 아래 케이스를 `describe("parseApiError - ApiError 입력", ...)` 블록에 추가한다.

```ts
  it("ApiError가 아닌 값은 폴백 메시지를 반환한다", () => {
    expect(parseApiError(new Error("boom"))).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(parseApiError(null)).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(parseApiError(undefined)).toEqual({
      message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  });
```

- [ ] **Step 4: 전체 검증**

Run: `bun run lint`
Expected: 통과. 실패하면 `bun run format`으로 포맷을 맞추고 남은 지적은 직접 고친다.

Run: `bun run test`
Expected: 전체 통과.

Run: `bun run test:coverage`
Expected: **실패한다.** `src/lib/**` functions 임계값이 미달인데, 원인은 `src/lib/authCookies.ts`의 커버리지 0%로 #42 이전부터 있던 문제다 (이슈 #44로 분리). 확인할 것은 **회귀가 없다는 것**이다:

- `src/services/**`는 임계값(lines/functions/statements 80%, branches 70%)을 충족해야 한다. 미달이면 부족한 분기의 테스트를 추가한다.
- `src/lib/**`의 실패 항목이 `authCookies.ts`로 인한 functions 하나뿐이어야 한다. `errors.ts` 때문에 실패하거나 실패 항목이 늘었다면 회귀이므로 고친다.

참고 실측 (2026-07-17): `fix/auth` 기준 에러 3건(lines 68.18% / functions 60% / statements 72%) → Task 1 이후 에러 1건(functions 71.42%).

Run: `bun run build`
Expected: 통과.

Run: `grep -rn "apiFetch" src/`
Expected: 결과 없음.

Run: `grep -rn "from \"axios\"" src/`
Expected: `src/services/apiClient.ts`, `src/lib/errors.ts`, `src/app/auth/kakao/callback/page.tsx`, 그리고 테스트 파일들만 나온다. 서비스 파일에 남아 있으면 안 된다.

- [ ] **Step 5: 커밋**

```bash
git add src/services/apiClient.ts src/services/apiClient.test.ts src/lib/errors.ts src/lib/errors.test.ts
git commit -m "refactor(services): apiFetch 제거하고 에러 파싱을 ApiError로 일원화

모든 서비스가 apiClient로 이관돼 fetch 기반 apiFetch의 소비자가 없다.
parseApiError가 \"API 4xx: <body>\" 문자열을 정규식으로 되파싱하던
왕복도 함께 제거한다.

Closes #42"
```

---

## Self-Review

**스펙 커버리지**

| 스펙 요구사항 | 태스크 |
| --- | --- |
| `apiClient`를 axios 인스턴스 export로 전환 | 2, 8 |
| `apiFetch` 제거 | 8 |
| 인터셉터에서 `ApiError` 정규화 | 1, 2 |
| `parseApiError` 정규식 파싱 제거 | 8 |
| `ApiError`에 `status` 보존 | 1 |
| 5개 서비스 이관 | 3, 4, 5, 6, 7 |
| `BASE_URL` export 삭제 | 8 |
| 테스트 mocking 계층 교체 | 1~8 각 태스크 |
| 콜백 페이지 `axios.post` 유지 | Global Constraints |
| 검증 (`lint`/`test`/`build`) | 8 |

**타입 일관성**

- `ApiError(status, message, code?, traceId?)` 인자 순서를 Task 1, 5, 6, 7에서 동일하게 사용한다.
- `toApiError(error: unknown): ApiError`를 Task 1에서 정의하고 Task 2, 8에서 소비한다.
- `authHeaders(accessToken?: string)`는 `authService`/`basketService`/`itineraryService` 각 파일에 지역 함수로 둔다. 원래 각 파일에 있던 형태를 유지하며, 3줄짜리를 공유 모듈로 빼는 건 이 리팩터링의 범위가 아니다.

**주의**

- Task 4의 `contentService.test.ts`는 기존에 `apiFetch` 참조가 0이었다. 파일에 다른 테스트가 있으면 지우지 말고 추가만 한다.
- Task 5, 6은 기존 테스트 파일의 전체 내용을 보고 케이스별로 옮겨야 한다. 이 계획은 assertion 변환 패턴만 제시한다.
