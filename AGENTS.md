<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Pick Trip Client

# Introduce

Pick Trip Client는 경상도 소도시(하동, 영주, 예천) 중심의 여행 콘텐츠 탐색과 AI 일정 생성 서비스를 제공하는 웹 클라이언트다.

이 저장소는 사용자가 지역 콘텐츠를 탐색하고, 바구니처럼 원하는 콘텐츠를 선택하고, 여행 조건을 입력해 현실적인 일정 생성 결과를 확인하는 브라우저 경험을 담당한다. 백엔드 API는 `CMU02/pick-trip-server`가 제공하며, 이 저장소는 화면, 라우팅, 클라이언트 상태, API 호출 경계, 접근성, 반응형 UI 품질을 책임진다.

# Tech Stack

| 분류 | 기술 |
| --- | --- |
| 언어 | TypeScript 5 |
| 프레임워크 | Next.js 16.2.6 App Router |
| UI | React 19.2.4 |
| 스타일링 | Tailwind CSS 4 |
| 패키지 매니저 | Bun |
| 린터 / 포맷터 | Biome 2.2.0 |
| 컴파일 최적화 | React Compiler |

# Required Reading

코드를 수정하기 전에 작업 범위에 맞는 문서를 먼저 읽는다.

| 상황 | 먼저 읽을 문서 |
| --- | --- |
| 라우트, 레이아웃, App Router 파일 추가 | `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`, `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` |
| Server/Client Component 경계 변경 | `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` |
| 데이터 패칭, 로딩, 스트리밍 변경 | `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` |
| 환경변수 추가 | `node_modules/next/dist/docs/01-app/02-guides/environment-variables.md` |
| 이미지 처리 | `node_modules/next/dist/docs/01-app/01-getting-started/12-images.md` |
| Next 설정 변경 | `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/index.md` |

# Project Information

| title | path |
| --- | --- |
| 핵심 기능 | `.agents/docs/key-features.md` |
| 주요 사용 흐름 | `.agents/docs/key-usage-flow.md` |
| MVP 범위 | `.agents/docs/mvp-scope.md` |
| API 연동 방향 | `.agents/docs/api-integration.md` |
| 지역별 콘텐츠 방향 | `.agents/docs/content-direction-by-region.md` |
| 예외 처리 흐름 | `.agents/docs/error-handling-flow.md` |
| 정보 보안 보완 방안 | `.agents/docs/measures-to-enhance-information-security.md` |
| 패키지 매니저 가이드 | `.agents/docs/package-manager-guide.md` |

# Convention

| title | path |
| --- | --- |
| 코드 규칙 | `.agents/rules/code-convention.md` |
| 파일 구조 규칙 | `.agents/rules/file-structure.md` |
| 테스트 규칙 | `.agents/rules/test-convention.md` |
| Git 규칙 | `.agents/rules/git-convention.md` |
| 브랜치 포커스 | `.agents/rules/branch-focus.md` |
| Biome 설정 | `biome.json` |

# Quick Start

```bash
bun install
bun run dev
bun run lint
bun run build
```

# Project Structure

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── contents/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── _components/
│   ├── itinerary/
│   │   ├── page.tsx
│   │   └── _components/
│   └── share/
│       └── [id]/
│           └── page.tsx
├── components/
│   ├── ui/
│   └── layout/
├── hooks/
├── services/
├── types/
└── lib/
```

현재 저장소는 초기 App Router 구조다. 기능이 늘어날 때는 `.agents/rules/file-structure.md`의 권장 구조를 기준으로 확장한다.

- `src/app`은 라우팅과 route-level UI를 중심으로 둔다.
- 여러 라우트에서 공유하는 UI는 `src/components`에 둔다.
- 서버 API 호출, fetch wrapper, 타입 변환은 `src/services`에 둔다.
- 도메인 타입은 `src/types`에 둔다.
- 클라이언트 훅은 `src/hooks`에 둔다.
- 라우트 내부 전용 컴포넌트는 해당 라우트의 `_components` 폴더에 둔다.
- 공통 유틸과 오류 정규화는 `src/lib`에 둔다.
- 특정 도메인이 충분히 커지기 전까지는 `src/features`를 먼저 만들지 않는다.

# Next.js 16 Gotchas

- `page.tsx`, `layout.tsx`는 기본적으로 Server Component다. 이벤트 핸들러, `useState`, `useEffect`, `window`, `localStorage`가 필요할 때만 파일 최상단에 `"use client"`를 둔다.
- `"use client"` 파일이 import하는 모든 모듈은 클라이언트 번들 후보가 된다. 큰 화면 전체보다 작은 상호작용 컴포넌트에만 붙인다.
- Dynamic route의 `params`, `searchParams`는 Promise 타입으로 다룬다. 필요하면 `PageProps<'/route'>`와 `LayoutProps<'/route'>` 전역 helper를 사용한다.
- 비밀 값은 Server Component, Route Handler, 서버 전용 모듈에서만 사용한다. 브라우저에 공개해도 되는 값만 `NEXT_PUBLIC_` 접두사를 붙인다.
- `fetch`는 기본적으로 캐시되지 않는다. 캐시가 필요한 요청은 Next.js 16 문서의 `use cache`, revalidation, streaming 규칙을 확인한 뒤 적용한다.
- `next-env.d.ts`, `.next/`, `bun.lock`은 도구가 관리한다. 의도 없이 직접 편집하지 않는다.

# AI Constraints

다음 작업은 사용자 요청이 있더라도 진행 전에 위험을 알리고 확인을 받는다.

## 절대 금지

- `.env`, 토큰, OAuth secret, API key를 Git에 커밋
- 서버 전용 secret을 `NEXT_PUBLIC_` 환경변수로 노출
- 명시적 지시 없이 `main` 브랜치에 직접 커밋
- 명시적 지시 없이 `git push` 실행
- `node_modules`, `.next`, 빌드 산출물 직접 편집

## 확인 후 진행

- 공개 API 응답 구조 변경
- 인증/토큰 저장 방식 변경
- 라우트 구조 대규모 이동
- 패키지 매니저 변경
- Next.js 설정, React Compiler, TypeScript strict 설정 변경
