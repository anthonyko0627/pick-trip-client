import { isValidKoreaCoord } from "@/lib/geo";
import type { ContentDetail } from "@/types/content";

// 콘텐츠 상세가 좌표 기반 UI(지도·근처 콘텐츠)를 그리는지 판정한다.
// ContentDetailView가 지도를 그릴지, page.tsx가 Kakao Maps SDK를 미리 받을지를
// 같은 조건으로 정해야 하므로 한 곳에 둔다. ContentDetailView는 "use client"
// 모듈이라 거기서 export하면 서버 컴포넌트인 page.tsx가 호출할 수 없다.
export function hasContentCoord(
  content: Pick<ContentDetail, "latitude" | "longitude">,
): boolean {
  return isValidKoreaCoord(content.latitude, content.longitude);
}
