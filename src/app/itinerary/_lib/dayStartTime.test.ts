import { describe, expect, it } from "vitest";

import { buildDayStartTimeOptions } from "./dayStartTime";

describe("buildDayStartTimeOptions", () => {
  it("범위를 30분 간격으로 채운다", () => {
    const options = buildDayStartTimeOptions("05:00", "18:00");
    expect(options[0]).toBe("05:00");
    expect(options[1]).toBe("05:30");
    expect(options.at(-1)).toBe("18:00");
    expect(options).toHaveLength(27);
  });

  it("범위 경계의 분도 버리지 않는다", () => {
    // 시(hour)만 읽으면 서버가 400으로 거절할 "05:00"을 선택지로 내보내게 된다.
    const options = buildDayStartTimeOptions("05:30", "18:00");
    expect(options[0]).toBe("05:30");
    expect(options).not.toContain("05:00");
  });

  it("마지막 칸이 30분 간격에 안 맞으면 상한을 넘기지 않고 멈춘다", () => {
    const options = buildDayStartTimeOptions("05:00", "18:20");
    expect(options.at(-1)).toBe("18:00");
  });
});
