import { getContents } from "@/services/contentService";
import { REGIONS } from "@/types/region";

import { TryItGallery } from "./TryItGallery";

// 홈 첫 방문자가 /explore로 이동하지 않고도 "담기"를 한 번 경험하게 하는 섹션.
// 목록은 서버에서 받아 SSR HTML에 담고(크롤러 대응·레이아웃 시프트 방지),
// 담기 토글·카테고리 필터 같은 상호작용만 TryItGallery(클라이언트)가 맡는다.
// page.tsx에서 <Suspense>로 감싸 나머지 홈은 먼저 스트리밍된다.
export async function TryItSection() {
  const startDate = new Date().toISOString().split("T")[0];

  let contents: Awaited<ReturnType<typeof getContents>>["contents"] = [];
  try {
    // 카테고리 파라미터가 백엔드에 없어 카테고리별로 못 받는다. 넉넉한
    // 샘플을 한 번 받아 클라이언트에서 칩으로 거른다(축제처럼 전국 2개뿐인
    // 카테고리는 샘플에 안 잡힐 수 있고, 그때는 빈 상태 문구를 보여준다).
    const res = await getContents({
      regions: [...REGIONS],
      startDate,
      nights: 0,
      size: 48,
    });
    contents = res.contents;
  } catch {
    contents = [];
  }

  return <TryItGallery initialContents={contents} />;
}
