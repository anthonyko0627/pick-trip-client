import type { NextConfig } from "next";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 개발 중 같은 네트워크의 다른 기기(모바일 등)에서 접속할 때
  // HMR 등 dev 리소스 요청이 cross-origin으로 차단되지 않도록 허용한다.
  // allowedDevOrigins는 도메인 와일드카드와 같은 방식(점으로 구분된 세그먼트 단위 "*")으로
  // IPv4 주소도 매칭하므로, 개별 IP 대신 사설 네트워크 대역 전체를 패턴으로 등록한다.
  // - 192.168.0.0/16, 10.0.0.0/8은 세그먼트 2개가 고정이라 와일드카드 1개로 표현 가능
  // - 172.16.0.0/12는 두 번째 옥텟이 16~31 범위라 와일드카드로 한 번에 표현할 수 없어 나열한다
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "tong.visitkorea.or.kr",
      },
      {
        protocol: "https",
        hostname: "tong.visitkorea.or.kr",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
