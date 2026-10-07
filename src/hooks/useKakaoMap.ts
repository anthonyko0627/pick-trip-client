"use client";

import { useEffect, useState } from "react";

import { loadKakaoMaps, onKakaoMapsLateReady } from "@/lib/kakaoMapLoader";

type KakaoMapStatus = "loading" | "ready" | "error";

// Kakao Maps SDK 로드 상태를 구독하는 훅. 여러 지도 컴포넌트가 동시에 써도
// loadKakaoMaps 싱글턴 덕분에 SDK 는 한 번만 로드된다.
export function useKakaoMap(): { status: KakaoMapStatus } {
  const [status, setStatus] = useState<KakaoMapStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setStatus("ready");
    };
    // 느린 회선에서 로더의 상한을 넘겨 error 로 간 뒤에 SDK 초기화가 끝나면
    // 다시 ready 로 돌린다. 재마운트 전까지 안내 문구에 머물지 않게 한다.
    const unsubscribe = onKakaoMapsLateReady(markReady);
    loadKakaoMaps()
      .then(markReady)
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { status };
}
