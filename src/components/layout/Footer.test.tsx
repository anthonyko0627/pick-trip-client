import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "./Footer";

describe("Footer", () => {
  it("서비스 메뉴 링크를 올바른 href로 보여준다", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "콘텐츠 탐색" })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(
      screen.getByRole("link", { name: "AI 일정 만들기" }),
    ).toHaveAttribute("href", "/select/conditions");
    expect(screen.getByRole("link", { name: "내 일정" })).toHaveAttribute(
      "href",
      "/itineraries",
    );
    expect(screen.getByRole("link", { name: "찜한 콘텐츠" })).toHaveAttribute(
      "href",
      "/favorites",
    );
  });

  it("지역 링크가 해당 지역의 여행 조건 페이지로 이동한다", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: "하동" })).toHaveAttribute(
      "href",
      "/select/conditions?regions=HADONG",
    );
    expect(screen.getByRole("link", { name: "영주" })).toHaveAttribute(
      "href",
      "/select/conditions?regions=YEONGJU",
    );
    expect(screen.getByRole("link", { name: "예천" })).toHaveAttribute(
      "href",
      "/select/conditions?regions=YECHEON",
    );
  });

  it("문의·지원 링크와 연락처 정보를 보여준다", () => {
    render(<Footer />);

    expect(
      screen.getByRole("link", { name: "자주 묻는 질문" }),
    ).toHaveAttribute("href", "/faq");

    const contact = screen.getByRole("link", { name: "서비스 문의" });
    expect(contact).toHaveAttribute("href", "mailto:support@pick-trip.app");
    expect(contact).toHaveAttribute("target", "_blank");
    expect(contact).toHaveAttribute("rel", "noopener noreferrer");

    expect(
      screen.getByRole("link", { name: "support@pick-trip.app" }),
    ).toHaveAttribute("href", "mailto:support@pick-trip.app");
    expect(screen.getByText(/평일 09:00 – 18:00 응답/)).toBeInTheDocument();
  });

  it("하단 바에는 법적 링크가 이용약관, 개인정보처리방침 2개뿐이다", () => {
    render(<Footer />);

    const legalNav = screen.getByRole("navigation", { name: "약관 및 정책" });
    const links = within(legalNav).getAllByRole("link");

    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("이용약관");
    expect(links[0]).toHaveAttribute("href", "/terms");
    expect(links[1]).toHaveTextContent("개인정보처리방침");
    expect(links[1]).toHaveAttribute("href", "/privacy");
  });

  it("저작권 문구를 보여준다", () => {
    render(<Footer />);

    expect(
      screen.getByText("© 2026 PickTrip. All rights reserved."),
    ).toBeInTheDocument();
  });
});
