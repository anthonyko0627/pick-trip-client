import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { getContents } from "@/services/contentService";
import { REGIONS } from "@/types/region";

// 색인 대상 정적 공개 라우트. 인증·개인화 라우트는 robots.ts에서 disallow하므로
// 여기에 넣지 않는다.
const PUBLIC_PATHS = [
  "/",
  "/account-deletion",
  "/contents",
  "/explore",
  "/privacy",
  "/terms",
];

// 목록 페이지네이션이 예상과 다르게 끝나지 않을 때 빌드가 멈추지 않도록 두는
// 상한. 지역당 기본 20개 × 3지역 × 50페이지가 최대치다.
const MAX_CONTENT_PAGES = 50;

// 사이트맵은 기본적으로 빌드 시점에 한 번 생성된다. 콘텐츠 목록이 배포 시점
// 스냅샷에 영원히 고정되지 않도록 하루 단위로 다시 만든다.
export const revalidate = 86400;

// 콘텐츠 상세 URL에 쓸 id 목록.
//
// 한계: /api/v1/contents는 startDate와 nights가 필수인 "검색" API라 날짜와
// 무관한 카탈로그가 아니다. 오늘 날짜 기준 스냅샷으로 근사하므로, 그 시점
// 조건에 걸리지 않는 콘텐츠는 사이트맵에서 빠질 수 있다. 백엔드에 날짜
// 비의존 카탈로그 엔드포인트가 생기면 이 함수를 교체한다.
async function getContentIds(): Promise<string[]> {
  const startDate = new Date().toISOString().split("T")[0];
  const ids: string[] = [];
  let total = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_CONTENT_PAGES && ids.length < total; page++) {
    const res = await getContents({
      regions: [...REGIONS],
      startDate,
      nights: 0,
      page,
    });
    // 모든 지역이 소진되면 빈 목록이 돌아온다.
    if (res.contents.length === 0) break;
    ids.push(...res.contents.map((content) => content.id));
    total = res.total;
  }

  // 지역별 응답을 합치는 과정에서 같은 콘텐츠가 겹칠 수 있어 URL을 중복 제거한다.
  return [...new Set(ids)];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let contentIds: string[] = [];
  try {
    contentIds = await getContentIds();
  } catch {
    // 콘텐츠 조회가 실패해도 정적 라우트 사이트맵까지 함께 깨지지 않게 한다.
    contentIds = [];
  }

  // 실제 최종 수정일을 알 수 있는 경로가 없으므로 lastModified는 넣지 않는다.
  return [
    ...PUBLIC_PATHS.map((path) => ({
      url: new URL(path, SITE_URL).toString(),
    })),
    ...contentIds.map((id) => ({
      url: new URL(`/contents/${id}`, SITE_URL).toString(),
    })),
  ];
}
