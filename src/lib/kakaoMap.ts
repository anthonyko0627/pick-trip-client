// Kakao Maps JS SDK appkey. 브라우저에 그대로 노출되는 값이며(도메인 제한은
// Kakao 개발자 콘솔에서 건다), 서버 전용 길찾기 REST 키(KAKAO_REST_API_KEY)와는
// 다른 키다. SDK가 브라우저에서 로드되므로 NEXT_PUBLIC_ 접두사가 필수다.
export const KAKAO_JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";

// SDK 로더(sdk.js)를 받는 호스트. next.config.ts의 CSP도 이 값으로 조립한다.
export const KAKAO_MAPS_SDK_HOST = "dapi.kakao.com";
export const KAKAO_MAPS_SDK_ORIGIN = `https://${KAKAO_MAPS_SDK_HOST}`;

// sdk.js가 실행된 뒤 SDK가 내부적으로 본체(mapjsapi/.../kakao.js)와 지도
// 리소스를 받아 오는 CDN. sdk.js와 다른 호스트라 콜드 커넥션이 한 번 더
// 필요하므로, 지도를 쓰는 라우트에서는 미리 커넥션을 열어 둔다. CSP의
// script-src/style-src도 이 값으로 조립하므로 바꾸면 함께 따라간다.
export const KAKAO_MAPS_CDN_HOST = "t1.kakaocdn.net";
export const KAKAO_MAPS_CDN_ORIGIN = `https://${KAKAO_MAPS_CDN_HOST}`;

// SDK 스크립트 태그의 id. SSR 프리로드(KakaoMapsPreload)와 클라이언트
// 로더(kakaoMapLoader)가 같은 값을 쓴다.
export const KAKAO_MAPS_SCRIPT_ID = "kakao-maps-sdk";

// 쿼리스트링을 뺀 sdk.js URL. 문서에 이미 붙어 있는 SDK 스크립트를 appkey와
// 무관하게 찾아내는 데 쓴다.
export const KAKAO_MAPS_SDK_SRC_PREFIX = `${KAKAO_MAPS_SDK_ORIGIN}/v2/maps/sdk.js`;

// autoload=false: 스크립트 실행과 SDK 초기화를 분리해 kakao.maps.load로
// 초기화 시점을 직접 제어한다.
export const KAKAO_MAPS_SDK_SRC = `${KAKAO_MAPS_SDK_SRC_PREFIX}?appkey=${KAKAO_JS_KEY}&autoload=false`;
