import { describe, expect, it } from "vitest";

import robots from "./robots";

function disallowedPaths(): string[] {
  const { disallow } = robots().rules as { disallow: string[] };
  return disallow;
}

describe("robots", () => {
  it("인증·개인화 라우트를 크롤링에서 막는다", () => {
    expect(disallowedPaths()).toEqual([
      "/dashboard",
      "/favorites",
      "/itineraries",
      "/itinerary",
      "/login",
      "/mypage",
      "/select",
      "/auth",
      "/api",
    ]);
  });

  it("공유 페이지는 막지 않는다 (noindex 메타태그와 링크 미리보기를 위해)", () => {
    expect(disallowedPaths()).not.toContain("/share");
  });

  it("사이트맵 절대 URL을 알린다", () => {
    expect(robots().sitemap).toBe("https://www.pick-trip.app/sitemap.xml");
  });
});
