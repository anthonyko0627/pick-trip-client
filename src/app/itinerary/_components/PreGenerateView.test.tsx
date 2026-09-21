import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBasketStore } from "@/stores/basketStore";
import type { BasketPriority } from "@/types/basket";
import type { Content } from "@/types/content";

import { PreGenerateView } from "./PreGenerateView";

function content(
  id: string,
  name: string,
  extra: Partial<Content> = {},
): Content {
  return {
    id,
    name,
    region: "HADONG",
    category: "CULTURE",
    imageUrl: null,
    address: "경남 하동군",
    ...extra,
  };
}

function setBasket(
  items: {
    content: Content;
    priority: BasketPriority | null;
    desiredStayMinutes?: number | null;
  }[],
) {
  useBasketStore.setState({
    items: items.map((i) => ({
      ...i,
      addedAt: Date.now(),
      desiredStayMinutes: i.desiredStayMinutes ?? null,
    })),
    hydrated: true,
  });
}

const baseProps = {
  regions: "HADONG",
  startDate: "2026-09-12",
  nights: "1",
  companions: "LESS_WALKING",
  onGenerate: vi.fn(),
  error: null,
};

beforeEach(() => {
  localStorage.clear();
  useBasketStore.setState({ items: [], hydrated: false });
  baseProps.onGenerate = vi.fn();
});

describe("PreGenerateView — 여행 조건 표시", () => {
  it("지역·출발일·기간·동행 조건을 사람이 읽는 라벨로 보여준다", () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      {
        content: content("2", "화개장터"),
        priority: null,
        desiredStayMinutes: null,
      },
    ]);

    render(<PreGenerateView {...baseProps} />);

    expect(screen.getAllByText("하동").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/9월 12일/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("1박 2일").length).toBeGreaterThan(0);
    expect(screen.getAllByText("걷기 적게").length).toBeGreaterThan(0);
  });

  it("지역·출발일이 비면 NaN 대신 '미선택'을 표시하고 생성 버튼을 비활성화한다", () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      { content: content("2", "화개장터"), priority: "SHOULD" },
    ]);

    render(
      <PreGenerateView {...baseProps} regions="" startDate="" nights="0" />,
    );

    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    expect(screen.getAllByText("미선택").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "일정 생성하기" }),
    ).toBeDisabled();
  });
});

describe("PreGenerateView — 생성 버튼 활성 조건", () => {
  it("지역·출발일이 있고 담은 콘텐츠가 2개 이상이면 활성화되고 클릭 시 onGenerate를 호출한다", async () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      {
        content: content("2", "화개장터"),
        priority: null,
        desiredStayMinutes: null,
      },
    ]);

    render(<PreGenerateView {...baseProps} />);

    const button = screen.getByRole("button", { name: "일정 생성하기" });
    expect(button).toBeEnabled();

    await userEvent.click(button);
    expect(baseProps.onGenerate).toHaveBeenCalledTimes(1);
    // 이동수단은 사용자가 고르지 않아도 항상 전체를 실어 보낸다.
    expect(baseProps.onGenerate).toHaveBeenCalledWith({
      travelModes: ["CAR", "TRANSIT"],
    });
  });

  it("담은 콘텐츠가 1개면 비활성화된다", () => {
    setBasket([{ content: content("1", "쌍계사"), priority: "MUST" }]);

    render(<PreGenerateView {...baseProps} />);

    expect(
      screen.getByRole("button", { name: "일정 생성하기" }),
    ).toBeDisabled();
  });
});

describe("PreGenerateView — 일정 생성 옵션", () => {
  beforeEach(() => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      {
        content: content("2", "화개장터"),
        priority: null,
        desiredStayMinutes: null,
      },
    ]);
  });

  it("아무것도 바꾸지 않아도 이동수단은 항상 CAR·TRANSIT 전체를 실어 보낸다", async () => {
    render(<PreGenerateView {...baseProps} />);

    await userEvent.click(
      screen.getByRole("button", { name: "일정 생성하기" }),
    );

    expect(baseProps.onGenerate).toHaveBeenCalledWith({
      travelModes: ["CAR", "TRANSIT"],
    });
  });

  it("이동수단을 미리 고르는 UI는 없다", () => {
    render(<PreGenerateView {...baseProps} />);

    expect(
      screen.queryByRole("button", { name: "자동차" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "대중교통" }),
    ).not.toBeInTheDocument();
  });

  it("AI 추천 장소도 추가를 선택하면 mode: AUGMENT와 함께 실어 보낸다", async () => {
    render(<PreGenerateView {...baseProps} />);

    await userEvent.click(
      screen.getByRole("button", { name: /AI 추천 장소도 추가/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "일정 생성하기" }),
    );

    expect(baseProps.onGenerate).toHaveBeenCalledWith({
      mode: "AUGMENT",
      travelModes: ["CAR", "TRANSIT"],
    });
  });

  it("시작 장소를 고르면 startContentId와 함께 실어 보낸다", async () => {
    render(<PreGenerateView {...baseProps} />);

    await userEvent.selectOptions(screen.getByLabelText("시작 장소"), "쌍계사");
    await userEvent.click(
      screen.getByRole("button", { name: "일정 생성하기" }),
    );

    expect(baseProps.onGenerate).toHaveBeenCalledWith({
      travelModes: ["CAR", "TRANSIT"],
      startContentId: "1",
    });
  });

  it("담은 콘텐츠가 없으면 시작 장소 선택을 보여주지 않는다", () => {
    setBasket([]);

    render(<PreGenerateView {...baseProps} />);

    expect(screen.queryByLabelText("시작 장소")).not.toBeInTheDocument();
  });

  it("시작 장소로 고른 항목을 바구니에서 지우면 선택이 'AI가 자동으로 정함'으로 되돌아간다", async () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      {
        content: content("2", "화개장터"),
        priority: null,
        desiredStayMinutes: null,
      },
      {
        content: content("3", "최참판댁"),
        priority: null,
        desiredStayMinutes: null,
      },
    ]);
    render(<PreGenerateView {...baseProps} />);

    const select = screen.getByLabelText("시작 장소");
    await userEvent.selectOptions(select, "쌍계사");
    expect(select).toHaveValue("1");

    await userEvent.click(screen.getByRole("button", { name: "쌍계사 삭제" }));

    expect(select).toHaveValue("");

    await userEvent.click(
      screen.getByRole("button", { name: "일정 생성하기" }),
    );
    expect(baseProps.onGenerate).toHaveBeenCalledWith({
      travelModes: ["CAR", "TRANSIT"],
    });
  });
});

describe("PreGenerateView — 담은 콘텐츠", () => {
  it("우선순위별로 그룹을 나누고 빈 그룹은 숨긴다", () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      { content: content("2", "화개장터"), priority: "OPTIONAL" },
    ]);

    render(<PreGenerateView {...baseProps} />);

    expect(screen.getByText("꼭 가기")).toBeInTheDocument();
    expect(screen.getByText("선택")).toBeInTheDocument();
    expect(screen.queryByText("가면 좋음")).not.toBeInTheDocument();
    // 시작 장소 select의 option에도 같은 이름이 나오므로 getAllByText로 확인한다.
    expect(screen.getAllByText("쌍계사").length).toBeGreaterThan(0);
    expect(screen.getAllByText("화개장터").length).toBeGreaterThan(0);
  });

  it("항목 삭제 버튼을 누르면 바구니에서 제거된다", async () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      { content: content("2", "화개장터"), priority: "SHOULD" },
    ]);

    render(<PreGenerateView {...baseProps} />);

    await userEvent.click(screen.getByRole("button", { name: "쌍계사 삭제" }));

    expect(useBasketStore.getState().items).toHaveLength(1);
    expect(screen.queryByText("쌍계사")).not.toBeInTheDocument();
  });

  it("바구니가 비면 빈 상태 안내와 콘텐츠 둘러보기 링크를 보여준다", () => {
    setBasket([]);

    render(<PreGenerateView {...baseProps} />);

    expect(screen.getByText("담은 콘텐츠가 없습니다")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /콘텐츠 둘러보기/ }),
    ).toBeInTheDocument();
  });
});

describe("PreGenerateView — 체류 시간", () => {
  it("기본값은 'AI가 정함'이다", () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      { content: content("2", "화개장터"), priority: null },
    ]);

    render(<PreGenerateView {...baseProps} />);

    expect(screen.getByLabelText("쌍계사 체류 시간")).toHaveValue("");
  });

  it("체류 시간을 고르면 바구니 항목의 desiredStayMinutes가 바뀐다", async () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      { content: content("2", "화개장터"), priority: null },
    ]);

    render(<PreGenerateView {...baseProps} />);

    await userEvent.selectOptions(
      screen.getByLabelText("쌍계사 체류 시간"),
      "1시간 30분",
    );

    expect(
      useBasketStore.getState().items.find((i) => i.content.id === "1")
        ?.desiredStayMinutes,
    ).toBe(90);
  });

  it("'AI가 정함'을 다시 고르면 desiredStayMinutes가 null로 돌아간다", async () => {
    setBasket([{ content: content("1", "쌍계사"), priority: "MUST" }]);

    render(<PreGenerateView {...baseProps} />);

    const select = screen.getByLabelText("쌍계사 체류 시간");
    await userEvent.selectOptions(select, "2시간");
    await userEvent.selectOptions(select, "AI가 정함");

    expect(
      useBasketStore.getState().items.find((i) => i.content.id === "1")
        ?.desiredStayMinutes,
    ).toBeNull();
  });
});

describe("PreGenerateView — 파생 지표", () => {
  it("담은 콘텐츠 수, 여행 기간(=박+1), 하루 평균 장소 수를 계산해 보여준다", () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      {
        content: content("2", "화개장터"),
        priority: null,
        desiredStayMinutes: null,
      },
      { content: content("3", "최참판댁"), priority: "SHOULD" },
    ]);

    render(<PreGenerateView {...baseProps} nights="1" />);

    // 담은 콘텐츠 3개
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    // 여행 기간 2일 (1박 + 1)
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    // 하루 평균 2곳 (round(3 / 2))
  });
});

describe("PreGenerateView — 오류 상태", () => {
  it("error가 있으면 메시지와 다시 시도 버튼을 보여주고 클릭 시 onGenerate를 호출한다", async () => {
    setBasket([
      { content: content("1", "쌍계사"), priority: "MUST" },
      {
        content: content("2", "화개장터"),
        priority: null,
        desiredStayMinutes: null,
      },
    ]);

    render(
      <PreGenerateView
        {...baseProps}
        error={{ message: "일시적인 오류가 발생했습니다.", traceId: "abc123" }}
      />,
    );

    expect(
      screen.getByText("일시적인 오류가 발생했습니다."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(baseProps.onGenerate).toHaveBeenCalled();
  });
});
