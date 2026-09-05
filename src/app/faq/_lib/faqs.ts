// FAQ 원본 데이터. 페이지 본문 아코디언과 JSON-LD(FAQPage) 스키마가
// 같은 배열을 쓰므로 질문/답변은 여기 한 곳에서만 관리한다.
//
// 답변 수치·동작은 현재 구현 기준이다.
// - 로그인 없이 탐색·담기·생성 가능: 로그인 화면 안내 박스
// - 생성 소요 시간 "약 30초": itinerary 로딩 화면 문구
// - 최소 2개: BasketPanel "2개 이상 담으면 일정을 만들 수 있어요"
// - 담은 콘텐츠·저장 일정은 localStorage 저장(basketStore/savedItinerariesStore),
//   찜은 로그인 후 서버(/api/v1/favorites)에 저장(useFavorites)
// 구현이 바뀌면 답변도 함께 고친다.

export const CONTACT_EMAIL = "hyeonjun1968@naver.com";

export const FAQ_CATEGORIES = [
  "전체",
  "이용",
  "일정",
  "콘텐츠",
  "계정",
] as const;
export type FaqTab = (typeof FAQ_CATEGORIES)[number];
export type FaqCategory = Exclude<FaqTab, "전체">;

export interface FaqLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string[];
  link?: FaqLink;
}

export const FAQS: FaqItem[] = [
  {
    id: "login-not-required",
    category: "이용",
    question: "로그인하지 않아도 이용할 수 있나요?",
    answer: [
      "네. 콘텐츠 탐색, 마음에 드는 콘텐츠 담기, AI 일정 생성까지 로그인 없이 이용할 수 있습니다.",
      "다만 만든 일정을 저장하거나 찜한 콘텐츠를 다음에 다시 보려면 로그인이 필요합니다. 로그인은 Google·Kakao 계정으로 몇 초면 됩니다.",
    ],
  },
  {
    id: "generation-time",
    category: "일정",
    question: "AI 일정 생성은 얼마나 걸리나요?",
    answer: [
      "보통 30초 안팎이면 완성됩니다.",
      "담은 콘텐츠가 많거나 여행 기간이 길면 조금 더 걸릴 수 있습니다. 생성하는 동안 화면을 벗어나지 않고 잠시 기다려주세요.",
    ],
  },
  {
    id: "minimum-contents",
    category: "일정",
    question: "콘텐츠를 몇 개 담아야 일정을 만들 수 있나요?",
    answer: [
      "최소 2개를 담으면 'AI 일정 생성' 버튼이 활성화됩니다.",
      "여행 기간에 비해 너무 적게 담으면 동선이 단조로워질 수 있으니, 가고 싶은 곳을 넉넉히 담아두면 더 자연스러운 일정이 만들어집니다.",
    ],
  },
  {
    id: "edit-itinerary",
    category: "일정",
    question: "생성된 일정을 수정할 수 있나요?",
    answer: [
      "네. 결과 화면에서 장소 순서를 바꾸거나, 특정 장소를 고정하거나, 빼거나, 다른 장소로 교체할 수 있습니다.",
      "수정한 뒤 '일정 저장'을 누르면 변경 내용이 반영됩니다. 로그인 상태에서 저장한 일정은 '내 일정'에서 다시 열어볼 수 있습니다.",
    ],
  },
  {
    id: "wrong-place-info",
    category: "콘텐츠",
    question: "장소 정보가 실제와 다릅니다.",
    answer: [
      "콘텐츠 정보는 한국관광공사 TourAPI와 공공데이터포털의 관광 정보를 기반으로 합니다. 원본 데이터의 갱신 주기에 따라 영업시간·휴무일·주소 등이 실제와 다를 수 있습니다.",
      "잘못된 정보를 발견하시면 아래 방법으로 알려주세요. 확인 후 최대한 빠르게 반영하겠습니다.",
    ],
    // TODO: 콘텐츠 오류 신고용 구글 폼이 준비되면 href를 폼 URL로 교체한다.
    link: {
      href: `mailto:${CONTACT_EMAIL}`,
      label: "콘텐츠 정보 오류 신고",
      external: true,
    },
  },
  {
    id: "other-regions",
    category: "콘텐츠",
    question: "하동·영주·예천 외 지역도 추가되나요?",
    answer: [
      "지금은 경상도 소도시 세 곳(하동·영주·예천)에 집중하고 있습니다. 먼저 이 지역들의 콘텐츠와 일정 품질을 탄탄하게 다지는 단계입니다.",
      "확대 여부는 이용 데이터와 요청을 보며 검토할 예정입니다. 원하는 지역이 있다면 문의로 알려주세요.",
    ],
  },
  {
    id: "basket-retention",
    category: "계정",
    question: "담은 콘텐츠는 얼마나 유지되나요?",
    answer: [
      "담은 콘텐츠는 지금 사용 중인 브라우저에 저장되어, 같은 브라우저에서는 계속 유지됩니다.",
      "브라우저 방문 기록·사이트 데이터를 지우거나 시크릿 모드를 사용하면 사라지며, 다른 기기와는 공유되지 않습니다.",
    ],
  },
  {
    id: "delete-account",
    category: "계정",
    question: "계정을 삭제하면 저장한 일정도 사라지나요?",
    answer: [
      "계정을 삭제하면 계정에 연결된 정보가 삭제되며, 삭제된 정보는 복구할 수 없습니다.",
      "남기고 싶은 일정이 있다면 탈퇴 전에 '공유 링크 만들기'로 링크를 만들어 두시길 권장합니다. 공유 링크는 계정과 별개로 열람할 수 있습니다.",
    ],
  },
];

// JSON-LD FAQPage 스키마. generateMetadata가 아니라 페이지에서 직접
// <script type="application/ld+json">로 출력한다.
export function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer.join("\n\n"),
      },
    })),
  };
}
