# 일정 생성 v3: 일차별 시작 시각 지정 + 스톱별 오르막 정보 연동

## 배경

이 작업은 원래 "하루 시작 시각(dayStartTime) 사용자 지정 — 프론트 선반영"
(이슈 #145)으로 시작했다. 당시엔 백엔드가 이 필드를 몰라 **머지를 보류**하고
있었다(아래 "이전 배경" 참고).

이후 백엔드가 이슈 #87·#88(PR #92·#93, `pick-trip-server` main 머지 완료)로
`POST /api/v1/itineraries/generate` 요청·응답을 실제로 확장했다. 다만 미리
선반영해 둔 모양과는 계약이 다르다 — **일차 구분 없는 단일 `dayStartTime`이
아니라, 일차별 배열 `dayStartTimes`**다. 이 문서는 그 실제 계약에 맞춰 이전
작업을 고쳐 이어간다. 같은 백엔드 배포에 스톱별 오르막 정보(응답 확장)도
함께 왔으므로 한 브랜치(#145/feat/143)에서 같이 반영한다.

- 팀 가이드(아티팩트): https://claude.ai/artifact/98494d61-4afc-4fc5-8097-14277f1d7524
- 원본 스펙: `pick-trip-server` 저장소 `.agents/docs/api-endpoints.md`

## 실제 계약 (선반영 당시 가정과 다른 점)

| 항목 | 선반영 당시 가정 | 실제 배포된 계약 |
| --- | --- | --- |
| 요청 필드 | `dayStartTime?: string` (일차 구분 없음) | `dayStartTimes?: (string \| null)[]` (인덱스 = 일차) |
| 입력 UI | `<input type="time">` 1개 | 일차 수만큼 `<select>` |
| 허용 범위 | 06:00~20:00(추정) | **05:00~18:00**(서버 검증 기준) |
| 범위 밖 처리 | 프론트가 가까운 경계로 클램프 | 서버가 400 `VALIDATION_FAILED`로 거절(잘라내지 않음) — 그래서 선택지 자체를 범위로 제한 |

## 하위호환 원칙

- `dayStartTimes`를 안 보내면 모든 일차가 09:00 시작 — 지금과 동일하다.
- `elevationGainMeters`/`inclinePenaltyMinutes`는 값이 없거나 산출 불가면
  `null`이 아니라 **`0`**으로 온다(평지·자동차·도보 아닌 구간·하루 첫 스톱 포함).
  0이면 캡션을 숨긴다 — "해당 없음"과 "산출 불가"를 UI에서 구분하지 않는다.
- `inclinePenaltyMinutes`는 이미 `startTime`/`endTime`/`totalTravelMinutes`에
  반영된 값의 분해값이다. 화면의 이동시간 합계에 **더하지 않는다**.
- 순서를 바꿔 저장하면 "이전 스톱"이 달라져 두 값이 실제와 어긋난다 — 기존에
  방문 시각을 지우던 지점(`clearDaySchedule`)에서 함께 지운다.
- `POST .../regenerate`는 옵션을 받지 않으므로 항상 09:00 시작 — 손대지 않는다.
- 공유 조회(`/api/v1/share/...`) 응답에는 아직 두 필드가 없다.

## 작업 내용

1. **타입 계층** — `src/types/itinerary.ts`
   - `ItineraryGenerateRequest.dayStartTime` → `dayStartTimes?: (string | null)[]`.
   - `DAY_START_TIME_MIN`/`MAX` 상수(05:00/18:00) 추가.
   - `RawGeneratedItem`/`Item`/`ItemRequest`에 `elevationGainMeters?: number`,
     `inclinePenaltyMinutes?: number` 추가(옵셔널 — 구버전 백엔드·기존 테스트
     픽스처 호환).
2. **서비스 계층** — `src/services/itineraryService.ts`
   - `withSyntheticIds`가 두 필드를 옮기도록(`?? 0` 기본값) 반영.
3. **왕복 로직** — `src/lib/itinerary.ts`
   - `toSaveDays`: 두 필드를 저장 요청 body에 실어 보낸다(`?? undefined`로
     생략).
   - `clearDaySchedule`: 순서가 깨지는 지점에서 두 필드도 함께 지운다.
   - `formatIncline` 추가: `inclinePenaltyMinutes > 0`일 때만 캡션 문자열.
4. **스톱 카드 표시** — `src/app/itinerary/_components/PlaceItem.tsx`
   - 머무는 시간 캡션 옆에 오르막 캡션 추가(0이면 숨김).
5. **일차별 시작 시각 UI** — `src/app/itinerary/_components/PreGenerateView.tsx`
   - 단일 `<input type="time">`을 일차 수만큼의 `<select>`(05:00~18:00, 30분
     간격, 기본값 "AI 기본(09:00)")로 교체.
   - `buildGenerateOptions`: 전부 기본값이면 `dayStartTimes` 생략, 하나라도
     바꾸면 일차 수 길이 배열을 보낸다(미변경 일차는 `null`).

## 완료 조건

- [x] `bun run lint` · `bun run build` · `bun run test` 통과
- [x] 옵션 미사용 시 기존 요청·응답과 동일함을 회귀 테스트로 고정
- [x] 오르막 캡션이 0/undefined에서 렌더링되지 않음을 테스트로 고정
- [x] 순서 변경(이동/삭제/대체/혼잡 제안 수락) 후 두 필드가 지워짐을 테스트로 고정
- [x] PR #145 설명에서 "머지 보류" 경고를 제거하고 실제 반영 내용으로 갱신
- [ ] 로그인 구현 시 `src/app/itinerary/_lib/loginPreviewSchedule.ts`와
      `ItineraryClient.buildLoginPreviewItinerary`를 함께 삭제 (401 미리보기
      전용 임시 코드)

## 이전 배경 (선반영 당시, 지금은 해소됨)

당시 `GenerateItineraryRequest`(백엔드)가 unknown property를 허용하지 않아,
사용자가 기본값(09:00)에서 시간을 바꾸면 400으로 거부됐다. 그래서 백엔드
대응 필드가 배포되기 전까지 머지하지 않기로 했었다 — 이제 배포됐으므로 이
제약은 더 이상 적용되지 않는다.

## 참고 자료

- 이슈 #145(upstream `CMU02/pick-trip-client`), PR `anthonyko0627:feat/143`
- `pick-trip-server` 저장소 `.agents/docs/api-endpoints.md`
