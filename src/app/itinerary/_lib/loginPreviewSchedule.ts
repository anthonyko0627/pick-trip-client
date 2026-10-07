import { minutesToTime, timeToMinutes } from "@/lib/itinerary";

/**
 * 로그인 기능이 구현되기 전까지만 쓰는 임시 파일. generate가 401 AUTH_REQUIRED를
 * 내는 동안 결과 화면 UX를 확인할 수 있게, 지정한 시작 시각이 반영된 것처럼
 * 보여주는 가짜 스케줄러다. 실제 스케줄러가 아니라 이동 시간·운영 시간을 전혀
 * 고려하지 않는 근사치다. 로그인이 붙으면 이 파일과 ItineraryClient의
 * buildLoginPreviewItinerary를 함께 지운다.
 */

// 서버가 시작 시각을 안 받았을 때 쓰는 기본값과 같다(09:00).
const DEFAULT_START_MINUTES = 9 * 60;
const VISIT_MINUTES = 90;
const TRAVEL_MINUTES = 15;
const DAY_END_MINUTES = 24 * 60;

export interface PreviewTimeRange {
  startTime: string;
  endTime: string;
}

/**
 * 일차별로 흘러가는 가짜 시계를 만든다. 반환한 함수를 스톱 순서대로 호출하면
 * 그 일차의 다음 시간대를 준다. 시각을 보여주지 않아야 하는 두 경우에 null:
 *
 * - dayStartTimes가 없을 때(사용자가 시작 시각을 아예 안 건드림). 이때까지
 *   가짜 시각을 지어내면 진짜 AI 결과와 구분이 안 된다.
 * - 스톱이 자정을 넘길 때. 되감으면(% 24) 같은 일차 안에서 앞 스톱보다 이른
 *   시각이 찍혀 시간이 거꾸로 흐르는 것처럼 보인다.
 */
export function createLoginPreviewScheduler(
  dayStartTimes?: (string | null)[],
): (dayIndex: number) => PreviewTimeRange | null {
  const clockMinutesByDay = new Map<number, number>();

  return (dayIndex) => {
    if (!dayStartTimes) return null;

    const start =
      clockMinutesByDay.get(dayIndex) ??
      timeToMinutes(dayStartTimes[dayIndex]) ??
      DEFAULT_START_MINUTES;
    const end = start + VISIT_MINUTES;
    if (end >= DAY_END_MINUTES) return null;

    clockMinutesByDay.set(dayIndex, end + TRAVEL_MINUTES);
    return { startTime: minutesToTime(start), endTime: minutesToTime(end) };
  };
}
