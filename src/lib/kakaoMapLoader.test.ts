import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SDK_SRC =
  "https://dapi.kakao.com/v2/maps/sdk.js?appkey=test-key&autoload=false";
const SDK_SELECTOR = 'script[src^="https://dapi.kakao.com/v2/maps/sdk.js"]';

// autoload=false 로 받은 SDK 의 최소 표면. load(cb) 가 cb 를 부르면 초기화
// 완료, 부르지 않으면 2단계(kakao.js) 로드가 끝나지 않은 상태를 뜻한다.
function installMapsStub(load: (cb: () => void) => void) {
  // biome-ignore lint/suspicious/noExplicitAny: 테스트 전역에 SDK 표면을 최소 주입
  (window as any).kakao = { maps: { load } };
}

function sdkScripts(): HTMLScriptElement[] {
  return [...document.querySelectorAll<HTMLScriptElement>(SDK_SELECTOR)];
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "test-key");
  document.head.innerHTML = "";
  // biome-ignore lint/suspicious/noExplicitAny: 이전 테스트의 주입 해제
  (window as any).kakao = undefined;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("loadKakaoMaps", () => {
  it("SDK 스크립트를 붙이고 초기화 콜백이 오면 resolve 한다", async () => {
    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    const promise = loadKakaoMaps();
    const scripts = sdkScripts();

    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(SDK_SRC);
    expect(scripts[0].async).toBe(true);

    installMapsStub((cb) => cb());
    scripts[0].dispatchEvent(new Event("load"));

    await expect(promise).resolves.toBeUndefined();
  });

  it("SSR 프리로드 태그는 결과를 알 수 없으므로 새 태그로 바꿔 붙인다", async () => {
    // KakaoMapsPreload 가 HTML 에 실어 보낸 태그. HTML 파싱 중에 실행되므로
    // 하이드레이션 전에 이미 실패했다면 지금 붙이는 error 리스너는 호출되지
    // 않는다. 그 태그를 기다리면 상한까지 스피너에 머문다.
    const preloaded = document.createElement("script");
    preloaded.async = true;
    preloaded.id = "kakao-maps-sdk";
    preloaded.src = SDK_SRC;
    document.head.appendChild(preloaded);

    const { loadKakaoMaps } = await import("./kakaoMapLoader");
    const promise = loadKakaoMaps();

    const scripts = sdkScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0]).not.toBe(preloaded);
    expect(scripts[0].id).toBe("kakao-maps-sdk");

    installMapsStub((cb) => cb());
    scripts[0].dispatchEvent(new Event("load"));

    await expect(promise).resolves.toBeUndefined();
  });

  it("이미 실행된 SDK 가 있으면 스크립트를 추가하지 않고 바로 초기화한다", async () => {
    installMapsStub((cb) => cb());

    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    await expect(loadKakaoMaps()).resolves.toBeUndefined();
    expect(sdkScripts()).toHaveLength(0);
  });

  it("초기화 콜백이 오지 않으면 무한 대기하지 않고 reject 한다", async () => {
    vi.useFakeTimers();
    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    const promise = loadKakaoMaps();
    // sdk.js 는 200 으로 실행됐지만 2단계 로드가 끝나지 않아 load 콜백이 오지 않는 상황.
    installMapsStub(() => {});
    sdkScripts()[0].dispatchEvent(new Event("load"));

    const rejected = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
  });

  it("상한에 sdk.js 다운로드 시간은 넣지 않는다", async () => {
    vi.useFakeTimers();
    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    const promise = loadKakaoMaps();
    // 느린 회선에서 sdk.js 받는 데만 상한보다 오래 걸린 상황.
    await vi.advanceTimersByTimeAsync(20_000);

    installMapsStub((cb) => cb());
    sdkScripts()[0].dispatchEvent(new Event("load"));

    await expect(promise).resolves.toBeUndefined();
  });

  it("상한을 넘긴 뒤 초기화가 끝나면 구독자에게 알리고 다음 호출은 바로 성공한다", async () => {
    vi.useFakeTimers();
    const { loadKakaoMaps, onKakaoMapsLateReady } = await import(
      "./kakaoMapLoader"
    );
    const lateReady = vi.fn();
    onKakaoMapsLateReady(lateReady);

    const promise = loadKakaoMaps();
    let finishInit = () => {};
    installMapsStub((cb) => {
      finishInit = cb;
    });
    sdkScripts()[0].dispatchEvent(new Event("load"));

    const rejected = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;
    expect(lateReady).not.toHaveBeenCalled();

    // 느린 회선에서 본체(kakao.js)가 상한 뒤에야 끝난 경우.
    finishInit();

    expect(lateReady).toHaveBeenCalledTimes(1);
    await expect(loadKakaoMaps()).resolves.toBeUndefined();
  });

  it("구독을 해제하면 늦은 초기화 알림을 받지 않는다", async () => {
    vi.useFakeTimers();
    const { loadKakaoMaps, onKakaoMapsLateReady } = await import(
      "./kakaoMapLoader"
    );
    const lateReady = vi.fn();
    const unsubscribe = onKakaoMapsLateReady(lateReady);

    const promise = loadKakaoMaps();
    let finishInit = () => {};
    installMapsStub((cb) => {
      finishInit = cb;
    });
    sdkScripts()[0].dispatchEvent(new Event("load"));

    const rejected = expect(promise).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;

    unsubscribe();
    finishInit();

    expect(lateReady).not.toHaveBeenCalled();
  });

  it("타임아웃 뒤 다시 호출하면 새 프라미스로 다시 기다린다", async () => {
    vi.useFakeTimers();
    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    const pending: (() => void)[] = [];
    const first = loadKakaoMaps();
    installMapsStub((cb) => {
      pending.push(cb);
    });
    sdkScripts()[0].dispatchEvent(new Event("load"));

    const rejected = expect(first).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(15_000);
    await rejected;

    // 버려진 프라미스를 재사용하면 두 번째 호출이 즉시 실패해버린다.
    const second = loadKakaoMaps();
    expect(pending).toHaveLength(2);
    pending[1]();

    await expect(second).resolves.toBeUndefined();
  });

  it("스크립트 로드가 실패하면 reject 하고 다음 시도를 위해 스크립트를 버린다", async () => {
    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    const promise = loadKakaoMaps();
    const rejected = expect(promise).rejects.toThrow(/failed to load/i);
    sdkScripts()[0].dispatchEvent(new Event("error"));
    await rejected;

    expect(sdkScripts()).toHaveLength(0);
  });

  it("appkey 가 없으면 reject 한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_KAKAO_JS_KEY", "");
    vi.resetModules();
    const { loadKakaoMaps } = await import("./kakaoMapLoader");

    await expect(loadKakaoMaps()).rejects.toThrow(/NEXT_PUBLIC_KAKAO_JS_KEY/);
    expect(sdkScripts()).toHaveLength(0);
  });
});
