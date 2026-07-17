// 브라우저에서는 same-origin 상대 경로로 요청해 next.config.ts의 rewrites가
// 백엔드로 프록시하도록 하고(CORS 회피), 서버(Server Component 등)에서는
// Next.js 서버를 거치지 않고 백엔드로 직접 요청한다.
export const BASE_URL =
  typeof window === "undefined"
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080")
    : "";

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, options);

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`API ${response.status}: ${bodyText}`);
  }

  const bodyText = await response.text();
  return (bodyText ? JSON.parse(bodyText) : undefined) as T;
}
