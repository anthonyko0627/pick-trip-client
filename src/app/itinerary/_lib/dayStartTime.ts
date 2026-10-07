import { minutesToTime, timeToMinutes } from "@/lib/itinerary";

const STEP_MINUTES = 30;

/**
 * 일차별 시작 시각 select의 선택지. 범위 밖은 서버가 400으로 거절하므로
 * min~max(포함) 안쪽만 30분 간격으로 만든다. 상한이 간격에 안 맞으면 넘기지
 * 않고 멈춘다. 경계값의 분(minute)도 그대로 지킨다 — 시만 읽으면 서버가
 * 거절할 시각이 선택지에 섞인다.
 */
export function buildDayStartTimeOptions(min: string, max: string): string[] {
  const start = timeToMinutes(min);
  const end = timeToMinutes(max);
  if (start === null || end === null) return [];

  const options: string[] = [];
  for (let m = start; m <= end; m += STEP_MINUTES) {
    options.push(minutesToTime(m));
  }
  return options;
}
