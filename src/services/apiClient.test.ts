import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./apiClient";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("JSON 바디가 있는 응답은 파싱해서 반환한다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "1" }), { status: 200 }),
    );

    const result = await apiFetch<{ id: string }>("/api/v1/example");

    expect(result).toEqual({ id: "1" });
  });

  it("빈 바디의 200 응답은 예외 없이 undefined를 반환한다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));

    const result = await apiFetch("/api/v1/auth/logout");

    expect(result).toBeUndefined();
  });

  it("응답이 실패(non-2xx)면 상태 코드와 바디를 포함해 throw 한다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('{"code":"AUTH_REQUIRED"}', { status: 401 }),
    );

    await expect(apiFetch("/api/v1/example")).rejects.toThrow(
      'API 401: {"code":"AUTH_REQUIRED"}',
    );
  });
});
