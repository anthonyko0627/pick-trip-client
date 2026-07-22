import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

import { useBasketStore } from "@/stores/basketStore";
import type { ContentDetail } from "@/types/content";

import { ContentDetailView } from "./ContentDetailView";

const stub: ContentDetail = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군 화개면",
  summary: "천년 고찰, 봄이면 벚꽃이 만발한다",
  indoor: false,
  operatingHours: "09:00 - 18:00",
  closedDay: "연중무휴",
  parking: true,
  stayDuration: "1시간",
  reservationRequired: false,
  dataSource: "한국관광공사",
  imageUrls: [],
};

describe("ContentDetailView", () => {
  beforeEach(() => {
    localStorage.clear();
    // 전역 바구니 스토어는 테스트 간 상태가 누수되므로 초기 상태로 리셋한다.
    useBasketStore.setState({ items: [], hydrated: false });
  });

  it("콘텐츠 이름을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("쌍계사")).toBeInTheDocument();
  });

  it("운영시간을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("09:00 - 18:00")).toBeInTheDocument();
  });

  it("주차 가능이면 '가능'을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("가능")).toBeInTheDocument();
  });

  it("예약 불필요이면 '불필요'를 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("불필요")).toBeInTheDocument();
  });

  it("운영시간이 null이면 정보 없음을 표시한다", () => {
    render(<ContentDetailView content={{ ...stub, operatingHours: null }} />);
    expect(screen.getAllByText("정보 없음").length).toBeGreaterThan(0);
  });

  it("데이터 출처를 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByText("한국관광공사")).toBeInTheDocument();
  });

  it("담기 버튼을 렌더한다", () => {
    render(<ContentDetailView content={stub} />);
    expect(screen.getByRole("button", { name: /담기/ })).toBeInTheDocument();
  });

  it("담기 버튼 클릭 시 새로고침 없이 담김으로 즉시 바뀐다", async () => {
    render(<ContentDetailView content={stub} />);

    await userEvent.click(screen.getByRole("button", { name: "담기" }));

    expect(screen.getByRole("button", { name: "담김" })).toBeInTheDocument();
  });
});
