export default function ContentDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 h-4 w-16 animate-pulse rounded bg-muted" />
      <div className="mb-6 aspect-video animate-pulse rounded-xl bg-muted" />
      <div className="mb-2 h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-1 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-6 flex flex-col gap-1.5">
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 스켈레톤 고정 목록
          <div key={i} className="flex gap-2">
            <div className="h-4 w-28 shrink-0 animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-9 w-full animate-pulse rounded-4xl bg-muted" />
    </div>
  );
}
