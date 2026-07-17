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
