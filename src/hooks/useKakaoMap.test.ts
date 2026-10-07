import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadKakaoMaps = vi.fn<() => Promise<void>>();
const lateReadyListeners = new Set<() => void>();

vi.mock("@/lib/kakaoMapLoader", () => ({
  loadKakaoMaps: () => loadKakaoMaps(),
  onKakaoMapsLateReady: (listener: () => void) => {
    lateReadyListeners.add(listener);
    return () => {
      lateReadyListeners.delete(listener);
    };
  },
}));

import { useKakaoMap } from "./useKakaoMap";

beforeEach(() => {
  loadKakaoMaps.mockReset();
  lateReadyListeners.clear();
});

describe("useKakaoMap", () => {
  it("로드가 끝나면 ready 가 된다", async () => {
    loadKakaoMaps.mockResolvedValue();

    const { result } = renderHook(() => useKakaoMap());

    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("상한을 넘겨 error 로 간 뒤 늦게 초기화되면 ready 로 돌아온다", async () => {
    loadKakaoMaps.mockRejectedValue(new Error("Kakao Maps SDK load timed out"));

    const { result } = renderHook(() => useKakaoMap());
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => {
      for (const listener of lateReadyListeners) listener();
    });

    expect(result.current.status).toBe("ready");
  });

  it("언마운트하면 늦은 초기화 구독을 해제한다", () => {
    loadKakaoMaps.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useKakaoMap());
    expect(lateReadyListeners.size).toBe(1);

    unmount();

    expect(lateReadyListeners.size).toBe(0);
  });
});
