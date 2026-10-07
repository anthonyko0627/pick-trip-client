import { describe, expect, it } from "vitest";

import { createLoginPreviewScheduler } from "./loginPreviewSchedule";

describe("createLoginPreviewScheduler", () => {
  it("시작 시각을 지정하지 않았으면 시각을 지어내지 않는다", () => {
    // 지정하지 않은 사용자에게까지 가짜 시각을 보여주면, 이동·운영 시간을
    // 전혀 모르는 근사치가 진짜 AI 결과와 구분 없이 보인다.
    const next = createLoginPreviewScheduler(undefined);
    expect(next(0)).toBeNull();
    expect(next(0)).toBeNull();
  });

  it("지정한 시작 시각부터 체류 90분 · 이동 15분으로 이어 붙인다", () => {
    const next = createLoginPreviewScheduler(["10:30", null]);
    expect(next(0)).toEqual({ startTime: "10:30", endTime: "12:00" });
    expect(next(0)).toEqual({ startTime: "12:15", endTime: "13:45" });
  });

  it("지정하지 않은 일차는 서버 기본값 09:00에서 시작한다", () => {
    const next = createLoginPreviewScheduler(["10:30", null]);
    expect(next(1)).toEqual({ startTime: "09:00", endTime: "10:30" });
  });

  it("일차별 시계가 서로 섞이지 않는다", () => {
    const next = createLoginPreviewScheduler(["10:30", null]);
    next(0);
    expect(next(1)).toEqual({ startTime: "09:00", endTime: "10:30" });
    expect(next(0)).toEqual({ startTime: "12:15", endTime: "13:45" });
  });

  it("자정을 넘기는 스톱부터는 시각을 비운다 — 되감아 거꾸로 흐르지 않는다", () => {
    // 되감던 시절엔 4번째 스톱이 "23:15~00:45", 5번째가 "01:00~02:30"으로
    // 같은 1일차 안에서 앞 스톱보다 이른 시각이 찍혔다.
    const next = createLoginPreviewScheduler(["18:00"]);
    expect(next(0)).toEqual({ startTime: "18:00", endTime: "19:30" });
    expect(next(0)).toEqual({ startTime: "19:45", endTime: "21:15" });
    expect(next(0)).toEqual({ startTime: "21:30", endTime: "23:00" });
    expect(next(0)).toBeNull();
    expect(next(0)).toBeNull();
  });
});
