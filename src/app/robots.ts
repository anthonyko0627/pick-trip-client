import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

// 로그인·개인화 화면과 서버 경계(OAuth 콜백, API 프록시)는 색인 대상이 아니다.
// 접두사로 매칭되므로 /dashboard 하나로 /dashboard/for-you까지 함께 막힌다.
//
// /share는 일부러 여기에 넣지 않는다. robots.txt로 막힌 URL은 크롤러가 본문을
// 읽지 못해 noindex 메타태그도 볼 수 없고(외부 링크가 있으면 URL만 색인될 수
// 있다), 링크 미리보기 스크래퍼가 robots.txt를 따르면 공유 카드가 뜨지 않는다.
// 공유 페이지의 검색 비노출은 page.tsx의 generateMetadata가 내려주는
// noindex로 처리한다.
const DISALLOWED_PATHS = [
  "/dashboard",
  "/favorites",
  "/itineraries",
  "/itinerary",
  "/login",
  "/mypage",
  "/select",
  "/auth",
  "/api",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
