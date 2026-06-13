import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 각 테스트 후 렌더링된 DOM을 정리해 테스트 간 간섭을 막는다.
afterEach(() => {
  cleanup();
});
