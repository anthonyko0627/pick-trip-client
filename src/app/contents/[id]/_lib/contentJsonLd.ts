import { isValidKoreaCoord } from "@/lib/geo";
import { SITE_URL } from "@/lib/site";
import type { ContentDetail } from "@/types/content";

// 콘텐츠 상세의 JSON-LD. FAQPage(faq/_lib/faqs.ts)와 같은 방식으로 페이지에서
// <script type="application/ld+json">로 출력한다.
//
// @type을 TouristAttraction 하나로 고정하는 이유: 상세 응답에 category가 없어
// (types/content.ts의 Content.category는 선택값) 음식점/축제를 구분할 근거가
// 없다. 백엔드가 category를 내려주기 시작하면 FOOD → Restaurant,
// FESTIVAL → Festival 로 나눈다.
//
// operatingHours·closedDay를 openingHours로 넣지 않는 이유: TourAPI 원본이
// "연중무휴", "09:00~18:00 (동절기 17:00)" 같은 자유 텍스트라 schema.org가
// 요구하는 형식(Mo-Su 09:00-18:00)으로 신뢰할 만하게 변환할 수 없다. 잘못된
// 값을 넣느니 빼는 쪽이 낫다.
export function buildContentJsonLd(content: ContentDetail) {
  const url = new URL(`/contents/${content.id}`, SITE_URL).toString();

  // 상세는 imageUrls를, 목록에서 온 값은 imageUrl을 채운다. 둘 다 비면 생략한다.
  const images =
    content.imageUrls.length > 0
      ? content.imageUrls
      : content.imageUrl
        ? [content.imageUrl]
        : [];

  const summary = content.summary?.replace(/\s+/g, " ").trim();

  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    "@id": url,
    url,
    name: content.name,
    ...(summary ? { description: summary } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: content.address,
      addressCountry: "KR",
    },
    // 백엔드가 TourAPI 좌표를 못 채우면 0이 온다. 아프리카 앞바다 좌표를
    // 구조화 데이터로 내보내지 않도록 지도와 같은 관문을 쓴다.
    ...(isValidKoreaCoord(content.latitude, content.longitude)
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: content.latitude,
            longitude: content.longitude,
          },
        }
      : {}),
    // 주차 가능 여부는 아는 경우에만 넣는다. null은 "모름"이지 "없음"이 아니다.
    ...(content.parking !== null
      ? {
          amenityFeature: {
            "@type": "LocationFeatureSpecification",
            name: "주차",
            value: content.parking,
          },
        }
      : {}),
  };
}
