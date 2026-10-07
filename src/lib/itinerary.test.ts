import { describe, expect, it } from "vitest";

import type { Day } from "@/types/itinerary";

import {
  clearDaySchedule,
  dayTravelLabel,
  formatDayDate,
  formatDistanceKm,
  formatDuration,
  formatIncline,
  formatTimeRange,
  formatTravelMinutes,
  hasEmptyDay,
  minutesToTime,
  stayMinutes,
  sumDayTravel,
  sumRouteTravel,
  sumStayMinutes,
  timeToMinutes,
  toSaveDays,
} from "./itinerary";

const makeItem = (overrides: Partial<Day["items"][number]> = {}) => ({
  itemId: "item-1",
  contentId: "c-1",
  title: "쌍계사",
  order: 0,
  reason: "오전 배치",
  pinned: false,
  ...overrides,
});

const makeDay = (overrides: Partial<Day> = {}): Day => ({
  dayId: "day-1",
  dayIndex: 1,
  items: [makeItem()],
  ...overrides,
});

describe("dayTravelLabel", () => {
  it("CAR는 route가 있으면 route 거리·시간을 쓴다", () => {
    const label = dayTravelLabel(
      makeDay({ totalTravelMinutes: 75, totalTravelKm: 12.4 }),
      "CAR",
      {
        dayIndex: 1,
        points: [],
        route: {
          totalDistanceMeters: 8300,
          totalDurationSeconds: 1200,
          segments: [],
          path: [],
        },
      },
    );
    expect(label).toBe("20분 · 8.3km");
  });

  it("CAR는 route가 없으면 day.totalTravel* 로 폴백한다", () => {
    expect(
      dayTravelLabel(
        makeDay({ totalTravelMinutes: 75, totalTravelKm: 12.4 }),
        "CAR",
      ),
    ).toBe("1시간 15분 · 12.4km");
  });

  it("둘 다 없으면 null", () => {
    expect(
      dayTravelLabel(
        makeDay({ totalTravelMinutes: null, totalTravelKm: null }),
        "CAR",
      ),
    ).toBeNull();
  });

  it("TRANSIT은 route가 있어도 항상 day.totalTravel* 로 백엔드 대중교통 모델 값을 쓴다", () => {
    const label = dayTravelLabel(
      makeDay({ totalTravelMinutes: 75, totalTravelKm: 12.4 }),
      "TRANSIT",
      {
        dayIndex: 1,
        points: [],
        route: {
          totalDistanceMeters: 8300,
          totalDurationSeconds: 1200,
          segments: [],
          path: [],
        },
      },
    );
    expect(label).toBe("1시간 15분 · 12.4km");
  });
});

describe("sumRouteTravel", () => {
  it("route가 있는 날만 골라 거리·시간을 합산한다", () => {
    const result = sumRouteTravel([
      {
        dayIndex: 1,
        points: [],
        route: {
          totalDistanceMeters: 8300,
          totalDurationSeconds: 1200,
          segments: [],
          path: [],
        },
      },
      {
        dayIndex: 2,
        points: [],
        route: {
          totalDistanceMeters: 14600,
          totalDurationSeconds: 1500,
          segments: [],
          path: [],
        },
      },
      { dayIndex: 3, points: [], route: null },
    ]);

    expect(result).toEqual({ km: 22.9, minutes: 45 });
  });

  it("route가 있는 날이 하나도 없으면 null을 반환한다", () => {
    expect(
      sumRouteTravel([
        { dayIndex: 1, points: [], route: null },
        { dayIndex: 2, points: [], route: null },
      ]),
    ).toBeNull();
  });
});

describe("timeToMinutes", () => {
  it('"HH:mm"을 자정 기준 분으로 바꾼다', () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("값이 없거나 형식이 어긋나면 null", () => {
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes(undefined)).toBeNull();
    expect(timeToMinutes("")).toBeNull();
    expect(timeToMinutes("아침")).toBeNull();
  });
});

describe("minutesToTime", () => {
  it('분을 "HH:mm"으로 바꾼다', () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(1439)).toBe("23:59");
  });

  it("하루를 넘는 값은 자정으로 되감지 않고 그대로 이어 센다", () => {
    // 되감으면 "00:30"이 되어 앞 스톱보다 이른 시각으로 보인다(v3 미리보기 버그).
    expect(minutesToTime(1470)).toBe("24:30");
  });
});

describe("stayMinutes", () => {
  it("시작·종료가 둘 다 있으면 분 차이를 반환한다", () => {
    expect(stayMinutes("09:30", "11:00")).toBe(90);
  });

  it("한쪽이라도 없으면 null", () => {
    expect(stayMinutes("09:30", null)).toBeNull();
    expect(stayMinutes(null, "11:00")).toBeNull();
    expect(stayMinutes(undefined, undefined)).toBeNull();
  });

  it("종료가 시작보다 빠르거나 같으면 null", () => {
    expect(stayMinutes("11:00", "09:30")).toBeNull();
    expect(stayMinutes("09:30", "09:30")).toBeNull();
  });

  it("형식이 어긋나면 null", () => {
    expect(stayMinutes("아침", "점심")).toBeNull();
  });
});

describe("sumStayMinutes", () => {
  it("모든 날의 체류 시간을 합한다", () => {
    const days = [
      makeDay({
        items: [
          makeItem({ startTime: "09:00", endTime: "10:30" }),
          makeItem({ startTime: "11:00", endTime: "12:00" }),
        ],
      }),
      makeDay({
        dayId: "day-2",
        items: [makeItem({ startTime: "13:00", endTime: "14:15" })],
      }),
    ];
    expect(sumStayMinutes(days)).toBe(90 + 60 + 75);
  });

  it("체류 시간이 계산되는 장소가 없으면 null", () => {
    expect(sumStayMinutes([makeDay({ items: [makeItem()] })])).toBeNull();
  });
});

describe("formatDuration", () => {
  it("0이면 당일치기를 반환한다", () => {
    expect(formatDuration(0)).toBe("당일치기");
  });

  it("1이면 1박 2일을 반환한다", () => {
    expect(formatDuration(1)).toBe("1박 2일");
  });

  it("3이면 3박 4일을 반환한다", () => {
    expect(formatDuration(3)).toBe("3박 4일");
  });
});

describe("formatTimeRange", () => {
  it("양쪽이 있으면 범위로 잇는다", () => {
    expect(formatTimeRange("09:30", "11:00")).toBe("09:30 – 11:00");
  });

  it("한쪽만 있으면 그쪽만 반환한다", () => {
    expect(formatTimeRange("09:30", null)).toBe("09:30");
    expect(formatTimeRange(null, "11:00")).toBe("11:00");
  });

  it("둘 다 없으면 null", () => {
    expect(formatTimeRange(null, null)).toBeNull();
    expect(formatTimeRange(undefined, undefined)).toBeNull();
  });
});

describe("formatTravelMinutes", () => {
  it("60분 미만은 분만", () => {
    expect(formatTravelMinutes(45)).toBe("45분");
  });

  it("시간과 분을 함께", () => {
    expect(formatTravelMinutes(90)).toBe("1시간 30분");
  });

  it("정시는 시간만", () => {
    expect(formatTravelMinutes(120)).toBe("2시간");
  });

  it("null이나 0은 null", () => {
    expect(formatTravelMinutes(0)).toBeNull();
    expect(formatTravelMinutes(null)).toBeNull();
    expect(formatTravelMinutes(undefined)).toBeNull();
  });
});

describe("formatDistanceKm", () => {
  it("소수는 1자리로", () => {
    expect(formatDistanceKm(12.44)).toBe("12.4km");
  });

  it("정수는 소수점 없이", () => {
    expect(formatDistanceKm(12)).toBe("12km");
  });

  it("null이나 0은 null", () => {
    expect(formatDistanceKm(0)).toBeNull();
    expect(formatDistanceKm(null)).toBeNull();
    expect(formatDistanceKm(undefined)).toBeNull();
  });
});

describe("formatDayDate", () => {
  it("yyyy-MM-dd를 'M월 D일 (요일)'로 바꾼다", () => {
    // 2025-05-03은 토요일
    expect(formatDayDate("2025-05-03")).toBe("5월 3일 (토)");
    // 2026-07-01은 수요일
    expect(formatDayDate("2026-07-01")).toBe("7월 1일 (수)");
  });

  it("null이나 형식 불일치는 null", () => {
    expect(formatDayDate(null)).toBeNull();
    expect(formatDayDate(undefined)).toBeNull();
    expect(formatDayDate("")).toBeNull();
  });
});

describe("sumDayTravel", () => {
  it("이동값이 있는 날만 합산한다", () => {
    const days = [
      makeDay({ totalTravelMinutes: 30, totalTravelKm: 5.5 }),
      makeDay({ totalTravelMinutes: 45, totalTravelKm: 8.2 }),
      makeDay({ totalTravelMinutes: null, totalTravelKm: null }),
    ];
    expect(sumDayTravel(days)).toEqual({ totalMinutes: 75, totalKm: 13.7 });
  });

  it("어떤 날도 이동값이 없으면 둘 다 null", () => {
    const days = [makeDay(), makeDay({ totalTravelMinutes: null })];
    expect(sumDayTravel(days)).toEqual({ totalMinutes: null, totalKm: null });
  });
});

describe("hasEmptyDay", () => {
  it("장소 0개인 날이 있으면 true", () => {
    expect(hasEmptyDay([makeDay(), makeDay({ items: [] })])).toBe(true);
  });

  it("모든 날에 장소가 있으면 false", () => {
    expect(hasEmptyDay([makeDay(), makeDay()])).toBe(false);
  });
});

describe("clearDaySchedule", () => {
  it("이동 요약과 각 항목의 방문 시각을 지운다", () => {
    const day = makeDay({
      totalTravelMinutes: 20,
      totalTravelKm: 3.5,
      items: [
        makeItem({ startTime: "09:00", endTime: "10:30" }),
        makeItem({ itemId: "item-2", startTime: "11:00", endTime: "12:00" }),
      ],
    });

    const cleared = clearDaySchedule(day);

    expect(cleared.totalTravelMinutes).toBeNull();
    expect(cleared.totalTravelKm).toBeNull();
    expect(
      cleared.items.every((i) => i.startTime === null && i.endTime === null),
    ).toBe(true);
  });

  it("dayIndex·items 순서 등 나머지 필드는 그대로 둔다", () => {
    const day = makeDay({ dayIndex: 3 });

    const cleared = clearDaySchedule(day);

    expect(cleared.dayIndex).toBe(3);
    expect(cleared.items).toHaveLength(1);
    expect(cleared.items[0].contentId).toBe("c-1");
  });

  it("v3: 순서가 어긋난 오르막 정보도 함께 지운다", () => {
    const day = makeDay({
      items: [
        makeItem({ elevationGainMeters: 120.5, inclinePenaltyMinutes: 12 }),
      ],
    });

    const cleared = clearDaySchedule(day);

    expect(cleared.items[0].elevationGainMeters).toBeUndefined();
    expect(cleared.items[0].inclinePenaltyMinutes).toBeUndefined();
  });
});

describe("toSaveDays", () => {
  it("방문 시각·이동 요약을 왕복시키고 null은 생략한다", () => {
    const days = [
      makeDay({
        dayIndex: 1,
        totalTravelMinutes: 30,
        totalTravelKm: 5.5,
        items: [
          makeItem({ contentId: "c-1", startTime: "09:00", endTime: "10:30" }),
        ],
      }),
      makeDay({
        dayIndex: 2,
        totalTravelMinutes: null,
        totalTravelKm: null,
        items: [makeItem({ contentId: "c-2", startTime: null, endTime: null })],
      }),
    ];

    expect(toSaveDays(days)).toEqual([
      {
        dayIndex: 1,
        totalTravelMinutes: 30,
        totalTravelKm: 5.5,
        items: [
          {
            contentId: "c-1",
            title: "쌍계사",
            order: 0,
            reason: "오전 배치",
            pinned: false,
            startTime: "09:00",
            endTime: "10:30",
          },
        ],
      },
      {
        dayIndex: 2,
        totalTravelMinutes: undefined,
        totalTravelKm: undefined,
        items: [
          {
            contentId: "c-2",
            title: "쌍계사",
            order: 0,
            reason: "오전 배치",
            pinned: false,
            startTime: undefined,
            endTime: undefined,
          },
        ],
      },
    ]);
  });

  it("빈 날도 그대로 남긴다(거르지 않음)", () => {
    const days = [makeDay({ items: [] })];
    expect(toSaveDays(days)[0].items).toEqual([]);
  });

  it("v3: 오르막 정보를 왕복시키고, 없으면 생략한다", () => {
    const days = [
      makeDay({
        items: [
          makeItem({ elevationGainMeters: 120.5, inclinePenaltyMinutes: 12 }),
        ],
      }),
    ];

    expect(toSaveDays(days)[0].items[0]).toMatchObject({
      elevationGainMeters: 120.5,
      inclinePenaltyMinutes: 12,
    });
    expect(
      toSaveDays([makeDay()])[0].items[0].elevationGainMeters,
    ).toBeUndefined();
  });
});

describe("formatIncline", () => {
  it("오르막 페널티가 있으면 캡션 문자열을 반환한다", () => {
    expect(formatIncline(12, 120.5)).toBe("오르막 반영 +12분 · 상승 121m");
  });

  it("0이거나 없으면 null(캡션 숨김)", () => {
    expect(formatIncline(0, 0)).toBeNull();
    expect(formatIncline(null, null)).toBeNull();
    expect(formatIncline(undefined, undefined)).toBeNull();
  });
});
