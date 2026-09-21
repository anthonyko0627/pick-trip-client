import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// 달력 테스트는 "오늘"에서 며칠 뒤 날짜 셀을 클릭한다. 실제 오늘이 월말이면
// 그 날짜가 다음 달로 넘어가 달력에 없는(또는 과거 달의 동일 일자) 셀을 눌러
// 선택이 무시된다. 시스템 시간을 월 중순으로 고정해 오프셋(최대 5일)이 항상
// 같은 달 안에 있게 한다. shouldAdvanceTime로 userEvent 지연은 정상 동작한다.
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
});
afterAll(() => {
  vi.useRealTimers();
});

import { useBasketStore } from "@/stores/basketStore";
import type { Content } from "@/types/content";

import { TravelDateForm } from "./TravelDateForm";

const stub: Content = {
  id: "1",
  name: "쌍계사",
  region: "HADONG",
  category: "CULTURE",
  imageUrl: null,
  address: "경남 하동군",
  summary: "천년 고찰",
  indoor: false,
};

// 아래 날짜 헬퍼들은 "오늘 + 최대 5일"이 같은 달 안에 있다고 가정하므로,
// 월말에 실행하면 달력이 다음 달로 넘어가 실패한다. Date만 고정해 월초로 맞춘다.
// (setTimeout까지 가짜로 바꾸면 userEvent의 입력 지연이 멈춰 버린다.)
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 0, 5));
});

afterAll(() => {
  vi.useRealTimers();
});

// 캘린더가 기본으로 오늘이 속한 달을 보여주므로, 월 이동 없이 바로
// 클릭할 수 있는 "오늘"을 출발일로 고른다(과거 날짜는 선택 불가라 today가
// 안전한 최소값이다).
async function pickToday() {
  const today = new Date();
  await userEvent.click(
    screen.getByRole("button", { name: String(today.getDate()) }),
  );
}

// pickToday와 같은 전제: 테스트에 쓰는 오프셋(최대 5일)이 이번 달을 벗어나지
// 않는다고 가정한다(월 이동 없이 바로 클릭).
function dayAfterToday(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function pickDate(date: Date) {
  await userEvent.click(
    screen.getByRole("button", { name: String(date.getDate()) }),
  );
}

describe("TravelDateForm — 바구니 유지", () => {
  beforeEach(() => {
    localStorage.clear();
    useBasketStore.setState({ items: [], hydrated: false });
  });

  it("마운트해도 담아둔 바구니를 비우지 않는다", () => {
    useBasketStore.setState({
      items: [
        {
          content: stub,
          addedAt: Date.now(),
          priority: null,
          desiredStayMinutes: null,
        },
      ],
      hydrated: true,
    });

    render(<TravelDateForm regions="HADONG" />);

    expect(useBasketStore.getState().items).toHaveLength(1);
  });
});

describe("TravelDateForm — 동행 조건", () => {
  it("동행 조건 선택 섹션이 화면에 렌더된다", () => {
    render(<TravelDateForm regions="HADONG" />);

    expect(screen.getAllByText("동행 조건").length).toBeGreaterThan(0);
  });

  it("동행 조건을 선택하지 않아도 날짜·기간 입력 시 다음 버튼이 활성화된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    await pickToday();
    await userEvent.click(screen.getByRole("button", { name: "당일치기" }));

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });

  it("동행 조건 선택 시 URL에 companions 파라미터가 포함된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    await pickToday();
    await userEvent.click(screen.getByRole("button", { name: "당일치기" }));
    await userEvent.click(screen.getByRole("button", { name: "아이와 함께" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("companions=WITH_KIDS"),
    );
  });

  it("동행 조건 미선택 시 URL에 companions 파라미터가 없다", async () => {
    mockPush.mockClear();
    render(<TravelDateForm regions="HADONG" />);

    await pickToday();
    await userEvent.click(screen.getByRole("button", { name: "당일치기" }));
    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(mockPush).toHaveBeenCalledWith(
      expect.not.stringContaining("companions"),
    );
  });
});

describe("TravelDateForm — 달력만으로 기간 선택", () => {
  it("출발일에 이어 도착일을 클릭하면 기간 버튼을 누르지 않아도 다음 버튼이 활성화된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    await pickDate(dayAfterToday(1));
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();

    await pickDate(dayAfterToday(2));

    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
    // 1박(하루 차이)이라 "1박 2일" 프리셋이 자동으로 선택 상태가 된다.
    expect(screen.getByRole("button", { name: "1박 2일" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("프리셋과 맞지 않는 기간을 달력으로 고르면 직접 입력으로 전환되고 해당 박 수가 URL에 반영된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    await pickDate(dayAfterToday(2));
    await pickDate(dayAfterToday(5));

    expect(screen.getByRole("button", { name: "직접 입력" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("3박")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다음" }));

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("nights=3"));
  });

  it("같은 날짜를 두 번 클릭하면 당일치기로 자동 선택된다", async () => {
    render(<TravelDateForm regions="HADONG" />);

    const date = dayAfterToday(1);
    await pickDate(date);
    await pickDate(date);

    expect(screen.getByRole("button", { name: "당일치기" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  });
});
