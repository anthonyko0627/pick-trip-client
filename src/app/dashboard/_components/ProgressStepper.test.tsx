import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useBasketStore } from "@/stores/basketStore";
import { useSavedItinerariesStore } from "@/stores/savedItinerariesStore";
import type { Content } from "@/types/content";

import { ProgressStepper } from "./ProgressStepper";

const stubContent: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

function setBasketCount(count: number) {
  useBasketStore.setState({
    items: Array.from({ length: count }, (_, i) => ({
      content: { ...stubContent, id: String(i) },
      addedAt: Date.now(),
      priority: null,
      desiredStayMinutes: null,
    })),
    hydrated: true,
  });
}

function setSavedCount(count: number) {
  useSavedItinerariesStore.setState({
    items: Array.from({ length: count }, (_, i) => ({
      itineraryId: String(i),
      title: `일정 ${i}`,
      region: "HADONG",
      travelDate: "2026-08-01",
      duration: 1,
      savedAt: Date.now(),
    })),
    hydrated: true,
  });
}

describe("ProgressStepper", () => {
  beforeEach(() => {
    localStorage.clear();
    setBasketCount(0);
    setSavedCount(0);
  });

  it("바구니가 비어있으면 ①만 진행중이고 ②③은 예정이다", () => {
    render(<ProgressStepper />);

    expect(
      screen.getByRole("listitem", { name: "여행 조건: 진행중" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "콘텐츠 담기: 예정" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "AI 일정 생성: 예정" }),
    ).toBeInTheDocument();
  });

  it("바구니에 1개 담기면 ①완료 ②진행중 ③예정이다", () => {
    setBasketCount(1);
    render(<ProgressStepper />);

    expect(
      screen.getByRole("listitem", { name: "여행 조건: 완료" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "콘텐츠 담기: 진행중" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "AI 일정 생성: 예정" }),
    ).toBeInTheDocument();
  });

  it("바구니에 2개 이상 담기면 ①②완료 ③진행중이다", () => {
    setBasketCount(2);
    render(<ProgressStepper />);

    expect(
      screen.getByRole("listitem", { name: "여행 조건: 완료" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "콘텐츠 담기: 완료" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "AI 일정 생성: 진행중" }),
    ).toBeInTheDocument();
  });

  it("저장된 일정이 1개 이상이면 ①②③ 모두 완료다", () => {
    setBasketCount(2);
    setSavedCount(1);
    render(<ProgressStepper />);

    expect(
      screen.getByRole("listitem", { name: "여행 조건: 완료" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "콘텐츠 담기: 완료" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "AI 일정 생성: 완료" }),
    ).toBeInTheDocument();
  });
});
