import Image from "next/image";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { REGION_LABELS, REGIONS } from "@/types/region";

const SITE_NAV = [
  { href: "/", label: "홈" },
  { href: "/explore", label: "콘텐츠 탐색" },
  { href: "/select/conditions", label: "AI 일정 만들기" },
  // 로그인이 필요한 페이지지만, 비로그인 상태에서 눌리면 기존 가드가
  // 로그인으로 보내주므로 푸터에서 따로 감추지 않는다.
  { href: "/itineraries", label: "내 일정" },
  { href: "/favorites", label: "찜한 콘텐츠" },
] as const;

// 콘텐츠 정보 오류 신고는 구글 폼 URL이 정해지면 아래 항목을 추가한다.
// 신고가 쌓이면 자체 /report 페이지로 옮긴다.
// { href: "https://forms.gle/…", label: "콘텐츠 정보 오류 신고", external: true }
const SUPPORT_NAV = [
  { href: "/faq", label: "자주 묻는 질문", external: false },
  {
    href: "mailto:support@pick-trip.app",
    label: "서비스 문의",
    external: true,
  },
] as const;

const LEGAL_NAV = [
  { href: "/terms", label: "이용약관", strong: false },
  // 개인정보처리방침은 고지 의무가 있는 문서라 나머지 링크보다 눈에 띄게 둔다.
  { href: "/privacy", label: "개인정보처리방침", strong: true },
  // 스토어 심사에서 요구하는 계정 삭제 안내 URL이라 공개 위치에 링크를 둔다.
  { href: "/account-deletion", label: "계정 삭제 안내", strong: false },
] as const;

const COLUMN_TITLE_CLASS =
  "text-[11.5px] font-extrabold tracking-[0.1em] text-[oklch(0.45_0.02_30)]";
const NAV_LINK_CLASS =
  "text-[13.5px] text-[oklch(0.3_0.015_30)] transition-colors hover:text-primary";

export function Footer() {
  return (
    <footer className="border-t border-border bg-[oklch(0.985_0.008_30)]">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-[34px] px-4 pt-12 pb-[34px] sm:grid-cols-[1.55fr_0.9fr_0.9fr_1.05fr]">
        <div className="flex items-start gap-2">
          <Image src="/pick-trip-icon.svg" alt="" width={24} height={24} />
          <div>
            <p className="text-[15px] font-extrabold tracking-[-0.02em] text-foreground">
              Pick<span className="text-primary">Trip</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              하동·영주·예천의 여행 콘텐츠와
              <br />
              AI 맞춤 일정을 제공해요.
            </p>
          </div>
        </div>

        <div>
          <p className={COLUMN_TITLE_CLASS}>서비스</p>
          <ul className="mt-3 flex flex-col gap-[11px]">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={NAV_LINK_CLASS}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={COLUMN_TITLE_CLASS}>지역</p>
          <ul className="mt-3 flex flex-col gap-[11px]">
            {REGIONS.map((region) => (
              <li key={region}>
                <Link
                  href={`/select/conditions?regions=${region}`}
                  className={NAV_LINK_CLASS}
                >
                  {REGION_LABELS[region]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 연락처 블록 때문에 다른 세 열보다 세로로 길다. 의도된 것. */}
        <div>
          <p className={COLUMN_TITLE_CLASS}>문의 · 지원</p>
          <ul className="mt-3 flex flex-col gap-[11px]">
            {SUPPORT_NAV.map((item) =>
              item.external ? (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      NAV_LINK_CLASS,
                      "inline-flex items-center gap-1",
                    )}
                  >
                    {item.label}
                    <Icon name="external-link" size={13} />
                  </a>
                </li>
              ) : (
                <li key={item.href}>
                  <Link href={item.href} className={NAV_LINK_CLASS}>
                    {item.label}
                  </Link>
                </li>
              ),
            )}
          </ul>

          <div className="mt-[18px] border-t border-[oklch(0.94_0.012_30)] pt-4">
            <p className="text-[12px] text-[oklch(0.5_0.015_30)]">이메일</p>
            <a
              href="mailto:support@pick-trip.app"
              className="text-[13px] font-bold text-[oklch(0.52_0.19_28)] transition-colors hover:text-primary"
            >
              support@pick-trip.app
            </a>
            <p className="mt-2 text-[12px] leading-[1.6] text-[oklch(0.5_0.015_30)]">
              평일 09:00 – 18:00 응답
              <br />
              (주말·공휴일 제외)
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © 2026 PickTrip. All rights reserved.
          </p>
          <nav aria-label="약관 및 정책">
            <ul className="flex items-center gap-4">
              {LEGAL_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "text-xs transition-colors hover:text-primary",
                      item.strong
                        ? "font-bold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
