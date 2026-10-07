import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ContentDetail } from "@/types/content";

import { buildContentJsonLd } from "./contentJsonLd";

function detail(overrides: Partial<ContentDetail> = {}): ContentDetail {
  return {
    id: "c-1",
    name: "화개장터",
    region: "HADONG",
    imageUrl: null,
    address: "경상남도 하동군 화개면 쌍계로 15",
    imageUrls: [],
    operatingHours: null,
    closedDay: null,
    parking: null,
    stayDuration: null,
    reservationRequired: null,
    dataSource: null,
    latitude: 35.1,
    longitude: 127.7,
    ...overrides,
  };
}

describe("buildContentJsonLd", () => {
  it("상세 URL을 @id와 url에 쓰고 이름·주소를 채운다", () => {
    const jsonLd = buildContentJsonLd(detail());

    expect(jsonLd["@type"]).toBe("TouristAttraction");
    expect(jsonLd["@id"]).toBe("https://www.pick-trip.app/contents/c-1");
    expect(jsonLd.url).toBe("https://www.pick-trip.app/contents/c-1");
    expect(jsonLd.name).toBe("화개장터");
    expect(jsonLd.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "경상남도 하동군 화개면 쌍계로 15",
      addressCountry: "KR",
    });
  });

  it("유효한 한국 좌표만 geo로 내보낸다", () => {
    expect(buildContentJsonLd(detail())).toHaveProperty("geo", {
      "@type": "GeoCoordinates",
      latitude: 35.1,
      longitude: 127.7,
    });

    // 백엔드가 TourAPI 좌표를 못 채웠을 때 오는 값.
    expect(
      buildContentJsonLd(detail({ latitude: 0, longitude: 0 })),
    ).not.toHaveProperty("geo");
  });

  it("개요가 있으면 공백을 정리해 description으로 넣고, 없으면 생략한다", () => {
    expect(
      buildContentJsonLd(detail({ summary: "  섬진강변\n\n전통 시장  " })),
    ).toHaveProperty("description", "섬진강변 전통 시장");

    expect(buildContentJsonLd(detail())).not.toHaveProperty("description");
    expect(buildContentJsonLd(detail({ summary: "   " }))).not.toHaveProperty(
      "description",
    );
  });

  it("imageUrls를 우선 쓰고 없으면 imageUrl로 폴백한다", () => {
    expect(
      buildContentJsonLd(detail({ imageUrls: ["a.jpg", "b.jpg"] })),
    ).toHaveProperty("image", ["a.jpg", "b.jpg"]);

    expect(buildContentJsonLd(detail({ imageUrl: "c.jpg" }))).toHaveProperty(
      "image",
      ["c.jpg"],
    );

    expect(buildContentJsonLd(detail())).not.toHaveProperty("image");
  });

  // 이 JSON-LD는 TourAPI 원본 텍스트를 그대로 싣는다. page.tsx가 문자열
  // children으로 출력하는 한 React가 </script>를 중화하지만,
  // dangerouslySetInnerHTML로 바꾸면 그 보호가 사라진다. 출력 방식이 바뀌면
  // 이 테스트가 깨지도록 실제 렌더 결과를 검증한다.
  it("개요에 </script>가 섞여도 스크립트가 조기 종료되지 않는다", () => {
    const jsonLd = buildContentJsonLd(
      detail({ summary: "</script><script>alert(1)</script>" }),
    );
    const html = renderToStaticMarkup(
      createElement(
        "script",
        { type: "application/ld+json" },
        JSON.stringify(jsonLd),
      ),
    );

    // 여는 태그 하나와 닫는 태그 하나뿐이어야 한다.
    expect(html.match(/<\/script>/g)).toHaveLength(1);

    const body = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(JSON.parse(body).description).toBe(
      "</script><script>alert(1)</script>",
    );
  });

  it("주차 여부를 모르면(null) amenityFeature를 넣지 않는다", () => {
    expect(buildContentJsonLd(detail())).not.toHaveProperty("amenityFeature");

    expect(buildContentJsonLd(detail({ parking: false }))).toHaveProperty(
      "amenityFeature",
      {
        "@type": "LocationFeatureSpecification",
        name: "주차",
        value: false,
      },
    );
  });
});
