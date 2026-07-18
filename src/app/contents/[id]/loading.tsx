// ContentDetailView와 완전히 같은 텍스트 클래스를 쓰고 text-transparent + bg-muted로
// 덮어, 실제 상세 화면과 스켈레톤의 크기 비율이 로딩 전후로 어긋나지 않게 맞춘다.
export default function ContentDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6" aria-hidden="true">
      <div className="mb-4 w-16 animate-pulse rounded bg-muted text-sm text-transparent">
        ← 목록으로
      </div>
      <div className="relative mb-6 aspect-video animate-pulse overflow-hidden rounded-xl bg-muted" />

      <div className="mb-2 flex items-start justify-between gap-3">
        <h1 className="w-48 animate-pulse rounded bg-muted text-xl font-semibold text-transparent leading-tight">
          콘텐츠 이름
        </h1>
        <span className="shrink-0 animate-pulse rounded-full bg-muted px-2.5 py-0.5 text-xs text-transparent font-medium">
          카테고리
        </span>
      </div>

      <p className="mb-1 w-32 animate-pulse rounded bg-muted text-sm text-transparent">
        주소
      </p>
      <p className="mb-6 animate-pulse rounded bg-muted text-sm text-transparent">
        콘텐츠 상세 설명이 두세 줄 정도 이어지는 형태로 표시되는 자리표시자
        문구입니다. 실제 화면과 높이 비율을 맞추기 위한 더미 텍스트입니다.
      </p>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 스켈레톤 고정 목록
          <div key={i} className="flex gap-2 text-sm">
            <span className="w-28 shrink-0 animate-pulse rounded bg-muted text-transparent">
              항목
            </span>
            <span className="flex-1 animate-pulse rounded bg-muted text-transparent">
              값
            </span>
          </div>
        ))}
      </div>

      <div className="h-9 w-full animate-pulse rounded-4xl bg-muted" />
    </div>
  );
}
