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
  return { message: FALLBACK_MESSAGE };
}
