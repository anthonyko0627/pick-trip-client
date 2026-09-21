import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TripCourse } from "@/lib/tripCourses";
import type { BasketItem } from "@/types/basket";
import type { Content } from "@/types/content";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSave = vi.fn();
let mockItems: BasketItem[] = [];
vi.mock("@/hooks/useBasket", () => ({
  useBasket: () => ({ items: mockItems, save: mockSave }),
}));

import { TRIP_COURSES } from "@/lib/tripCourses";

import { TripCourseList } from "./TripCourseList";

const stubContent: Content = {
  id: "999",
  name: "이미 담은 곳",
  region: "HADONG",
  imageUrl: null,
  address: "",
};

beforeEach(() => {
  mockItems = [];
  mockPush.mockClear();
  mockSave.mockClear();
});

// 행 버튼의 접근성 이름은 순번·설명·배지까지 합쳐지므로 제목 텍스트로 버튼을 찾는다.
function rowButton(course: TripCourse): HTMLElement {
  const button = screen.getByText(course.title).closest("button");
  if (!button) throw new Error(`행 버튼을 찾지 못했다: ${course.title}`);
  return button;
}

describe("TripCourseList", () => {
  it("코스 개수만큼 행을 렌더하고 'N곳'이 spots.length와 일치한다", () => {
    render(<TripCourseList />);

    for (const course of TRIP_COURSES) {
      expect(screen.getByText(course.title)).toBeInTheDocument();
    }

    const fiveSpots = TRIP_COURSES.filter((c) => c.spots.length === 5).length;
    expect(screen.getAllByText("5곳")).toHaveLength(fiveSpots);
  });

  it("바구니가 비어 있으면 행 클릭 시 코스 장소로 save 후 요약 화면으로 이동한다", async () => {
    render(<TripCourseList />);

    const course = TRIP_COURSES[0];
    await userEvent.click(rowButton(course));

    expect(mockSave).toHaveBeenCalledTimes(1);
    const saved = mockSave.mock.calls[0][0] as BasketItem[];
    expect(saved).toHaveLength(course.spots.length);
    expect(saved.map((i) => i.content.id)).toEqual(
      course.spots.map((s) => s.id),
    );
    expect(saved.every((i) => i.priority === "MUST")).toBe(true);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush.mock.calls[0][0]).toMatch(
      /^\/itinerary\?regions=HADONG&startDate=\d{4}-\d{2}-\d{2}&nights=1$/,
    );
  });

  it("동행 조건이 있는 코스는 href에 companions를 붙인다", async () => {
    render(<TripCourseList />);

    const course = TRIP_COURSES.find((c) => c.companions.length > 0);
    if (!course) throw new Error("동행 조건이 있는 코스가 없다");
    await userEvent.click(rowButton(course));

    expect(mockPush.mock.calls[0][0]).toContain(
      `companions=${course.companions.join(",")}`,
    );
  });

  it("바구니에 담긴 게 있으면 행 클릭 시 이동 대신 확인 UI를 보여준다", async () => {
    mockItems = [
      {
        content: stubContent,
        addedAt: Date.now(),
        priority: null,
        desiredStayMinutes: null,
      },
    ];
    render(<TripCourseList />);

    const course = TRIP_COURSES[0];
    await userEvent.click(rowButton(course));

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.getByText("현재 담은 1개를 이 코스로 바꿉니다."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "계속" }));

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("확인 UI가 뜬 상태에서 같은 행을 다시 누르면 확인 없이 이동하지 않는다", async () => {
    mockItems = [
      {
        content: stubContent,
        addedAt: Date.now(),
        priority: null,
        desiredStayMinutes: null,
      },
    ];
    render(<TripCourseList />);

    const course = TRIP_COURSES[0];
    await userEvent.click(rowButton(course));
    expect(
      screen.getByText("현재 담은 1개를 이 코스로 바꿉니다."),
    ).toBeInTheDocument();

    // 확인 패널이 뜬 채로 같은 행을 재클릭 — no-op이어야 한다.
    await userEvent.click(rowButton(course));

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.getByText("현재 담은 1개를 이 코스로 바꿉니다."),
    ).toBeInTheDocument();
  });

  it("확인 UI에서 취소를 누르면 이동하지 않고 확인 UI가 닫힌다", async () => {
    mockItems = [
      {
        content: stubContent,
        addedAt: Date.now(),
        priority: null,
        desiredStayMinutes: null,
      },
    ];
    render(<TripCourseList />);

    await userEvent.click(rowButton(TRIP_COURSES[0]));
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      screen.queryByText("현재 담은 1개를 이 코스로 바꿉니다."),
    ).not.toBeInTheDocument();
  });
});
