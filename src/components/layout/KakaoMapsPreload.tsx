import {
  KAKAO_JS_KEY,
  KAKAO_MAPS_CDN_ORIGIN,
  KAKAO_MAPS_SCRIPT_ID,
  KAKAO_MAPS_SDK_SRC,
} from "@/lib/kakaoMap";

// 지도를 첫 화면에 그리는 라우트의 Server Component가 렌더한다.
//
// 지도가 늦게 뜨는 원인은 좌표·경로 조회가 아니라 SDK 로드 체인이 하이드레이션
// 뒤에야 출발하는 데 있다. loadKakaoMaps는 useEffect 안에서 스크립트를 처음
// 붙이므로, 클라이언트 번들을 전부 받고 하이드레이션이 끝날 때까지
// dapi.kakao.com 요청이 시작되지 않는다(운영 실측 2.3초). 이 태그들을 SSR HTML에
// 실어 보내면 HTML 파싱 시점에 받기 시작해 번들 다운로드와 겹쳐 진행된다.
// 하이드레이션 전에 실행까지 끝나면 loadKakaoMaps는 window.kakao.maps를 바로
// 쓰고, 아직이면 결과를 알 수 없는 이 태그를 새 태그로 바꿔 붙인다(같은 URL이라
// 연결·캐시를 재사용한다).
//
// React 19가 `<script async src>`와 `<link rel="preconnect">`를 <head>로 올리고
// src 기준으로 중복을 제거하므로, 한 화면에 지도가 여러 개여도 한 번만 실린다.
// react-dom의 preinit/preconnect 대신 태그로 렌더하는 이유는 그쪽이 라우트에
// 따라 preconnect를 HTML에 넣지 않고 RSC 페이로드에만 남기는 경우가 있어서다.
export function KakaoMapsPreload() {
  // 키가 없으면 SDK를 받아도 쓸 수 없다. 받아 두기만 하는 요청을 만들지 않는다.
  if (!KAKAO_JS_KEY) return null;

  return (
    <>
      {/* sdk.js가 실행된 뒤에야 알 수 있는 2단계 CDN(본체 kakao.js·타일)의
          DNS·TLS를 미리 끝내 둔다. dapi.kakao.com은 아래 스크립트가 이미
          커넥션을 열므로 중복으로 걸지 않는다. */}
      <link rel="preconnect" href={KAKAO_MAPS_CDN_ORIGIN} />
      <script async id={KAKAO_MAPS_SCRIPT_ID} src={KAKAO_MAPS_SDK_SRC} />
    </>
  );
}
