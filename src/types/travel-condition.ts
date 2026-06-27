export type TravelDuration = "DAY_TRIP" | "ONE_NIGHT" | "TWO_NIGHTS" | "CUSTOM";

export type CompanionCondition =
  | "WITH_KIDS"
  | "WITH_PARENTS"
  | "WHOLE_FAMILY"
  | "LESS_WALKING"
  | "NATURE_FOCUSED"
  | "EXPERIENCE_FOCUSED"
  | "FOOD_FOCUSED"
  | "INDOOR_NEEDED";

export const COMPANION_CONDITIONS: {
  value: CompanionCondition;
  label: string;
}[] = [
  { value: "WITH_KIDS", label: "아이와 함께" },
  { value: "WITH_PARENTS", label: "부모님과 함께" },
  { value: "WHOLE_FAMILY", label: "가족 전체" },
  { value: "LESS_WALKING", label: "걷기 적게" },
  { value: "NATURE_FOCUSED", label: "자연 위주" },
  { value: "EXPERIENCE_FOCUSED", label: "체험 위주" },
  { value: "FOOD_FOCUSED", label: "음식 위주" },
  { value: "INDOOR_NEEDED", label: "실내 대안 필요" },
];

export interface DurationPreset {
  value: TravelDuration;
  label: string;
  nights: number; // 0 = 당일치기, -1 = CUSTOM
}

export const DURATION_PRESETS: DurationPreset[] = [
  { value: "DAY_TRIP", label: "당일치기", nights: 0 },
  { value: "ONE_NIGHT", label: "1박 2일", nights: 1 },
  { value: "TWO_NIGHTS", label: "2박 3일", nights: 2 },
  { value: "CUSTOM", label: "직접 입력", nights: -1 },
];
