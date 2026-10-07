import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 이 컴포넌트는 화면에 아무것도 그리지 않고 <head> 로 올라갈 태그만 내보낸다.
// 클라이언트로 렌더하면 React 가 호이스팅한 리소스를 테스트 간에 정리하지 않아
// 서로 간섭하므로, 서버 렌더 결과(실제로 HTML 에 실리는 것)를 검증한다.
async function renderPreloadMarkup(): Promise<string> {
  const { KakaoMapsPreload } = await import("./KakaoMapsPreload");
  return renderToStaticMarkup(<KakaoMapsPreload />);
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("KakaoMapsPreload", () => {
  it("SDK 스크립트와 2단계 CDN preconnect 를 함께 내보낸다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "test-key");

    const markup = await renderPreloadMarkup();

    expect(markup).toContain(
      'src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=test-key&amp;autoload=false"',
    );
    // 하이드레이션을 막지 않도록 반드시 async 다.
    expect(markup).toMatch(/<script[^>]*\basync\b/);
    // SDK 가 실행된 뒤에야 알 수 있는 본체·타일 CDN. 미리 커넥션을 열어 둔다.
    expect(markup).toContain(
      '<link rel="preconnect" href="https://t1.kakaocdn.net"',
    );
  });

  it("appkey 가 없으면 아무것도 내보내지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "");

    expect(await renderPreloadMarkup()).toBe("");
  });
});
