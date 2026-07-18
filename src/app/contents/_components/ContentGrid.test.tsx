import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

import type { Content } from "@/types/content";

import { ContentGrid } from "./ContentGrid";

const makeContent = (overrides: Partial<Content> = {}): Content => ({
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군 화개면",
  summary: "천년 고찰",
  indoor: false,
  ...overrides,
});

const defaultItineraryHref =
  "/itinerary?regions=HADONG&startDate=2026-06-20&nights=1";

describe("ContentGrid", () => {
  it("전달받은 콘텐츠 카드를 모두 렌더한다", () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    render(
      <ContentGrid
        initialContents={contents}
        itineraryHref={defaultItineraryHref}
      />,
    );

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.getByText("하동 재첩국")).toBeInTheDocument();
  });

  it("카테고리 필터 선택 시 해당 카테고리만 표시된다", async () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사", category: "CULTURE" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    render(
      <ContentGrid
        initialContents={contents}
        itineraryHref={defaultItineraryHref}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "문화" }));

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.queryByText("하동 재첩국")).not.toBeInTheDocument();
  });

  it("검색어 입력 시 이름이 일치하는 카드만 표시된다", async () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    render(
      <ContentGrid
        initialContents={contents}
        itineraryHref={defaultItineraryHref}
      />,
    );

    await userEvent.type(screen.getByRole("searchbox"), "쌍계");

    expect(screen.getByText("쌍계사")).toBeInTheDocument();
    expect(screen.queryByText("하동 재첩국")).not.toBeInTheDocument();
  });

  it("필터 결과가 없을 때 빈 상태 메시지를 표시한다", async () => {
    render(
      <ContentGrid
        initialContents={[makeContent({ name: "쌍계사" })]}
        itineraryHref={defaultItineraryHref}
      />,
    );

    await userEvent.type(screen.getByRole("searchbox"), "없는콘텐츠xyz");

    expect(
      screen.getByText(/조건에 맞는 콘텐츠가 없습니다/),
    ).toBeInTheDocument();
  });

  it("콘텐츠가 없을 때 빈 상태 메시지를 표시한다", () => {
    render(
      <ContentGrid initialContents={[]} itineraryHref={defaultItineraryHref} />,
    );

    expect(screen.getByText(/콘텐츠가 없습니다/)).toBeInTheDocument();
  });

  it("콘텐츠를 카테고리별 섹션으로 나누어 표시한다", () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사", category: "CULTURE" }),
      makeContent({ id: "2", name: "화개장터", category: "CULTURE" }),
      makeContent({ id: "3", name: "하동 재첩국", category: "FOOD" }),
    ];

    render(
      <ContentGrid
        initialContents={contents}
        itineraryHref={defaultItineraryHref}
      />,
    );

    expect(screen.getByRole("heading", { name: /문화/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /음식/ })).toBeInTheDocument();

    const cultureHeading = screen.getByRole("heading", { name: /문화/ });
    expect(cultureHeading).toHaveTextContent("2개");

    const foodHeading = screen.getByRole("heading", { name: /음식/ });
    expect(foodHeading).toHaveTextContent("1개");
  });

  it("카테고리가 없는 콘텐츠는 기타 섹션으로 묶인다", () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사", category: undefined }),
    ];

    render(
      <ContentGrid
        initialContents={contents}
        itineraryHref={defaultItineraryHref}
      />,
    );

    expect(screen.getByRole("heading", { name: /기타/ })).toBeInTheDocument();
  });

  it("카테고리 필터 적용 시 선택한 카테고리 섹션만 표시된다", async () => {
    const contents = [
      makeContent({ id: "1", name: "쌍계사", category: "CULTURE" }),
      makeContent({ id: "2", name: "하동 재첩국", category: "FOOD" }),
    ];

    render(
      <ContentGrid
        initialContents={contents}
        itineraryHref={defaultItineraryHref}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "문화" }));

    expect(screen.getByRole("heading", { name: /문화/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /음식/ }),
    ).not.toBeInTheDocument();
  });
});
