# 디자인 시스템 토큰 도입 (amber/teal 팔레트)

## Context

`C:\Users\USER\OneDrive\Desktop\WEB`에 있는 PickTrip 웹 프로토타입(React, 인라인
스타일, `components.jsx`/`web-components.jsx`/`web-dashboard.jsx`/
`web-profile.jsx`)을 디자인 근거로 삼아 기존 라우트의 톤앤매너를 교체한다.

현재 프로젝트는 shadcn 기본 무채색(oklch grayscale) 토큰만 있고, 홈(`/`)은
create-next-app 기본 화면이 그대로 남아 있는 등 시각적으로 거의 미착수 상태다.
로그인/대시보드/프로필처럼 참고 파일에는 있지만 이 저장소에 없는 화면은 이번
범위에서 제외하고, 기존 라우트(`/`, `/select`, `/select/conditions`, `/contents`,
`/contents/[id]`, `/itinerary`, `/itineraries`)에만 디자인을 적용한다.

작업을 한 브랜치에 몰아넣지 않고 **토큰(이 계획) → 라우트별 적용**으로 나눈다.
이 계획은 그중 토큰 단계만 다룬다. `main` 기준으로 브랜치를 만들어, 이후 라우트별
브랜치가 이 토큰 위에서 작업하도록 한다.

## 색상 조사 결과

참고 파일의 `COLORS` 상수(`components.jsx`)를 hex로 대조한 결과, 값 대부분이
Tailwind CSS 기본 팔레트의 `amber`/`teal`/`gray` 스케일과 정확히 일치한다
(`amber-500=#F59E0B`, `amber-600=#D97706`, `amber-700=#B45309`,
`teal-500=#14B8A6`, `teal-600=#0D9488`, `teal-700=#0F766E`,
`gray-50=#F9FAFB`, `gray-100=#F3F4F6`, `gray-200=#E5E7EB`, `gray-400=#9CA3AF`,
`gray-500=#6B7280`, `gray-700=#374151`, `gray-900=#111827`). 일부 50/300 계열은
근사치(`amber-50` `#FFF8E1` vs Tailwind `#FFFBEB` 등)라 오차가 미미하다.

→ 커스텀 팔레트를 새로 정의하지 않고 **Tailwind CSS 4 기본 `amber`/`teal`/`gray`
유틸리티를 그대로 사용**한다. shadcn 시맨틱 토큰(`--primary`, `--secondary` 등)은
이 기본 팔레트를 가리키도록 `globals.css`에서 재매핑만 한다.

## 구현 범위

### 수정할 파일

| 파일 | 변경 내용 |
|---|---|
| `src/app/globals.css` | `:root`/`.dark`의 시맨틱 색상 변수를 amber/teal/gray 팔레트로 재매핑 |
| `src/app/layout.tsx` | 본문 폰트를 Figtree → Noto Sans KR로 교체, `<html lang>`을 `"en"` → `"ko"`로 수정 |

버튼/카드 등 개별 컴포넌트는 모두 `bg-primary`, `border-border`, `bg-muted`
같은 시맨틱 유틸리티를 이미 쓰고 있어 **토큰만 바꾸면 자동으로 반영**된다.
`Button`, `RegionCard`, `ContentCard`, `BasketDrawer` 등은 이번 단계에서 직접
수정하지 않는다.

### 토큰 매핑 (`:root`)

| 변수 | 현재 | 변경 |
|---|---|---|
| `--background` | `oklch(1 0 0)` (흰색) | `var(--color-gray-50)` |
| `--foreground` | `oklch(0.145 0 0)` | `var(--color-gray-900)` |
| `--card-foreground` | `oklch(0.145 0 0)` | `var(--color-gray-900)` |
| `--primary` | `oklch(0.205 0 0)` (검정) | `var(--color-amber-500)` |
| `--primary-foreground` | `oklch(0.985 0 0)` | `var(--color-white)` |
| `--secondary` | `oklch(0.97 0 0)` | `var(--color-gray-100)` |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `var(--color-gray-700)` |
| `--muted` | `oklch(0.97 0 0)` | `var(--color-gray-100)` |
| `--muted-foreground` | `oklch(0.556 0 0)` | `var(--color-gray-500)` |
| `--accent` | `oklch(0.97 0 0)` | `var(--color-amber-50)` |
| `--accent-foreground` | `oklch(0.205 0 0)` | `var(--color-amber-700)` |
| `--border` / `--input` | `oklch(0.922 0 0)` | `var(--color-gray-200)` |
| `--ring` | `oklch(0.708 0 0)` | `var(--color-amber-500)` |
| `--destructive` | 기존 oklch red 유지 | 변경 없음 (참고 파일 error 색상과 이미 근사치) |
| `--card` | `oklch(1 0 0)` | 변경 없음 (흰색 유지, `--background`와 대비) |

`--radius` 계열(8~18px 파생)은 참고 파일의 카드 라운드(8~16px)와 이미 근접해
그대로 둔다. pill 버튼은 기존 `rounded-full` 유틸리티로 이미 커버된다.

### `.dark` 블록

참고 파일은 다크모드를 정의하지 않는다. 기존 무채색 다크 팔레트를 유지하되
`--primary`/`--primary-foreground`/`--accent`/`--accent-foreground`만 amber
계열로 최소 반영해 라이트/다크 전환 시 브랜드 컬러가 완전히 사라지지 않게 한다.
다크모드 세부 튜닝은 이번 범위 밖 — 후속 이슈로 남긴다.

### 폰트/언어

- `layout.tsx`: `next/font/google`의 `Noto_Sans_KR` (`weight: ["400","500","600","700"]`, `subsets: ["latin"]`)를 `--font-sans` 변수로 연결, 기존 `Figtree` import 제거.
- `<html lang="en">` → `<html lang="ko">` (한국어 서비스인데 `en`으로 남아있던 기존 결함 수정, 이번 폰트 변경과 함께 처리).
- `Geist`/`Geist_Mono`는 현재 `--font-geist-sans`/`--font-mono`로만 연결돼 있고 실제 사용처가 없어 그대로 둔다(범위 밖 정리).

## 아이콘 (이번 범위 밖, 참고용 결정)

참고 파일은 외부 아이콘 라이브러리 없이 인라인 SVG를 직접 그린다. 이 저장소에도
아이콘 라이브러리가 없으므로, 이후 라우트별 적용 단계에서 새 의존성을 추가하지
않고 참고 파일의 SVG 세트를 로컬 `Icon` 컴포넌트로 이식하는 쪽으로 진행한다.
이번 토큰 PR에서는 다루지 않는다.

## 검증

- `bun run lint`, `bunx tsc --noEmit`, `bun run build`
- `bun run dev`로 기존 라우트(`/select`, `/contents`, `/itinerary`,
  `/itineraries`)를 열어 `bg-primary`/`border-border`/`bg-muted` 등을 쓰는
  기존 컴포넌트(`Button`, `RegionCard`, `ContentCard`, `BasketDrawer`)의 색상이
  amber/gray 톤으로 바뀌었는지, 레이아웃이 깨지지 않았는지 육안 확인.
