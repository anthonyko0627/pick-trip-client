import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_PATH, REFRESH_TOKEN_COOKIE } from "@/lib/authCookies";
import { logoutUser } from "@/services/authService";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.replace(/^Bearer\s+/i, "");

  try {
    await logoutUser(accessToken);
  } catch {
    // 백엔드 로그아웃 호출이 실패해도 로컬 세션(쿠키)은 정리한다 (best-effort).
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete({
    name: REFRESH_TOKEN_COOKIE,
    path: AUTH_COOKIE_PATH,
  });
  return response;
}
