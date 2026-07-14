// 로그인 후 이동할 next 경로를 검증한다. `/`로 시작하지 않거나 `//`로
// 시작하는 값(프로토콜 상대 URL)은 다른 도메인으로 보낼 수 있는 open
// redirect이므로 거부한다.
export function isSafeNextPath(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return true;
}
