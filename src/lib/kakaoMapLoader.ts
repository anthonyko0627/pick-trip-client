import {
  KAKAO_JS_KEY,
  KAKAO_MAPS_SCRIPT_ID,
  KAKAO_MAPS_SDK_SRC,
  KAKAO_MAPS_SDK_SRC_PREFIX,
} from "./kakaoMap";

// Kakao Maps SDK 를 한 번만 로드하는 모듈 싱글턴. 한 화면에 지도 인스턴스가
// 여러 개(전체 지도 + 일차별 지도)라 로드를 공유해야 한다. next/script 대신
// 이 방식을 쓰는 이유는 계획 문서(docs/plan/itinerary-map.md) 참고.

// sdk.js 는 200 으로 실행됐는데 SDK 가 내부적으로 받는 본체(kakao.js)가
// 끝나지 않으면 kakao.maps.load 콜백이 영원히 오지 않는다. 그때 스크립트
// 태그에는 error 이벤트가 뜨지 않으므로, 상한을 두지 않으면 프라미스가
// resolve 도 reject 도 되지 않아 화면이 "지도를 불러오는 중…"에 영구히
// 머문다. 상한을 넘기면 error 상태로 보내 안내 문구라도 뜨게 한다.
//
// 상한은 sdk.js 가 실행된 뒤 kakao.maps.load 를 기다리는 구간에만 건다.
// sdk.js 다운로드는 태그의 load/error 이벤트로 끝이 나므로, 그 시간까지
// 상한에 넣으면 느린 회선에서 정상 로드를 실패로 오판한다.
const LOAD_TIMEOUT_MS = 12_000;

let loadPromise: Promise<void> | null = null;

// 상한을 넘겨 reject 한 뒤에 SDK 가 늦게 준비된 경우를 알려 받을 구독자.
// 이미 reject 된 프라미스는 되돌릴 수 없으므로 따로 알린다.
const lateReadyListeners = new Set<() => void>();

export function onKakaoMapsLateReady(listener: () => void): () => void {
  lateReadyListeners.add(listener);
  return () => {
    lateReadyListeners.delete(listener);
  };
}

export function loadKakaoMaps(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("loadKakaoMaps must run in the browser"));
      return;
    }
    if (!KAKAO_JS_KEY) {
      reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY is not set"));
      return;
    }

    let settled = false;
    let timer: number | undefined;

    function settle(error?: Error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (!error) {
        resolve();
        return;
      }
      // 다음 시도가 새로 로드할 수 있도록 버린다.
      loadPromise = null;
      reject(error);
    }

    // autoload=false 로 받았으므로 kakao.maps.load 로 실제 초기화를 트리거한다.
    const ready = () => {
      const maps = window.kakao?.maps;
      if (!maps) {
        settle(new Error("Kakao Maps SDK loaded without window.kakao.maps"));
        return;
      }
      timer = window.setTimeout(() => {
        settle(new Error("Kakao Maps SDK load timed out"));
      }, LOAD_TIMEOUT_MS);
      maps.load(() => {
        if (!settled) {
          settle();
          return;
        }
        // 상한을 넘긴 뒤에 초기화가 끝났다. 지도는 이제 쓸 수 있으므로 다음
        // 호출은 바로 성공하게 하고, error 로 간 화면에는 늦게라도 알린다.
        loadPromise = Promise.resolve();
        for (const listener of lateReadyListeners) listener();
      });
    };

    if (window.kakao?.maps) {
      ready();
      return;
    }

    // KakaoMapsPreload 가 SSR HTML 에 실어 보낸 태그가 이미 있을 수 있다.
    // 그 태그는 HTML 파싱 중에 실행되므로, 광고 차단 등으로 하이드레이션 전에
    // 이미 실패했다면 지금 붙이는 error 리스너는 끝내 호출되지 않는다. 여기까지
    // 왔다는 건 window.kakao.maps 가 아직 없다는 뜻이고, 그 태그가 아직 받는
    // 중인지 이미 실패했는지는 알 수 없으므로 버리고 새로 붙인다. 받는 중이었다면
    // 같은 URL 이라 연결·캐시를 재사용하고, sdk.js 는 window.kakao.maps 를
    // 덮어쓰지 않아 두 번 실행돼도 안전하다.
    for (const stale of document.querySelectorAll<HTMLScriptElement>(
      `script[src^="${KAKAO_MAPS_SDK_SRC_PREFIX}"]`,
    )) {
      stale.remove();
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAPS_SCRIPT_ID;
    script.async = true;
    script.src = KAKAO_MAPS_SDK_SRC;
    script.addEventListener("load", ready, { once: true });
    script.addEventListener(
      "error",
      () => {
        // 다음 시도가 새로 붙일 수 있도록 실패한 스크립트는 버린다.
        script.remove();
        settle(new Error("Kakao Maps SDK failed to load"));
      },
      { once: true },
    );
    document.head.appendChild(script);
  });

  return loadPromise;
}
