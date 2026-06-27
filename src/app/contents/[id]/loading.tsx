export default function ContentDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 h-4 w-16 animate-pulse rounded bg-muted" />
      <div className="mb-6 aspect-video animate-pulse rounded-xl bg-muted" />
      <div className="mb-2 h-6 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-1 h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mb-6 h-10 w-full animate-pulse rounded bg-muted" />
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: 스켈레톤 고정 목록
          <div key={i} className="h-4 animate-pulse rounded bg-muted" />
        ))}
      </div>
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}
