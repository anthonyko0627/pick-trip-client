export interface ParsedApiError {
  message: string;
  code?: string;
  traceId?: string;
}

export function parseApiError(err: unknown): ParsedApiError {
  if (err instanceof Error) {
    // apiFetch throw 형식: "API 4xx: <body-text>"
    const bodyMatch = err.message.match(/^API \d+: ([\s\S]+)$/);
    if (bodyMatch) {
      try {
        const parsed = JSON.parse(bodyMatch[1]) as {
          code?: unknown;
          message?: unknown;
          traceId?: unknown;
        };
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
      return {
        message: "네트워크 연결을 확인하고 다시 시도해주세요.",
      };
    }
  }
  return {
    message: "오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  };
}
