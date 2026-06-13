import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("여러 클래스 문자열을 하나로 합친다", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("falsy 값은 무시한다", () => {
    expect(cn("text-sm", false, undefined, null, "font-medium")).toBe(
      "text-sm font-medium",
    );
  });

  it("충돌하는 Tailwind 클래스는 뒤쪽 값으로 병합한다", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
