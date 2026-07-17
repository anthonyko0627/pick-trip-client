import { describe, expect, it } from "vitest";
import { isSafeNextPath } from "./authRedirect";

describe("isSafeNextPath", () => {
  it.each([
    ["/itinerary?regions=HADONG", true],
    ["/", true],
    ["/select/conditions", true],
  ])("%s -> %s (안전한 내부 경로)", (value, expected) => {
    expect(isSafeNextPath(value)).toBe(expected);
  });

  it.each([
    ["//evil.com", false],
    ["https://evil.com", false],
    ["evil.com", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("%s -> %s (open redirect 위험 또는 값 없음)", (value, expected) => {
    expect(isSafeNextPath(value)).toBe(expected);
  });
});
