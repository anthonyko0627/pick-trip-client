import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `@/*` 경로 별칭을 tsconfig.json에서 읽어 그대로 해석한다. (Vite 네이티브 지원)
    tsconfigPaths: true,
  },
  test: {
    // describe/it/expect 등을 import 없이 전역으로 사용한다.
    globals: true,
    // 컴포넌트 렌더링 테스트를 위해 DOM 환경을 켠다.
    environment: "jsdom",
    // 매 테스트 파일 실행 전 jest-dom 매처와 cleanup을 등록한다.
    setupFiles: ["./vitest.setup.ts"],
    // 소스 옆에 위치한 테스트 파일만 수집한다.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist", "build"],
    // 테스트 간 mock 상태를 깔끔하게 유지한다.
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/*.d.ts",
        // 라우트 스캐폴딩은 단위 테스트 대상이 아니다. (추후 E2E로 검증)
        "src/app/**/{layout,page,loading,error,not-found,template,default}.tsx",
      ],
      thresholds: {
        // 글로벌 소프트 플로어. 코드가 쌓이면 의도적으로 올린다.
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 60,
        // 회귀 위험이 큰 로직 레이어는 더 엄격하게 건다.
        "src/lib/**": {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        "src/services/**": {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
      },
    },
  },
});
