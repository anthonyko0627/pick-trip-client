export default function ContentsLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-6 h-10 w-full animate-pulse rounded-lg bg-muted" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => (
              <div
                key={k}
                className="overflow-hidden rounded-xl border border-border"
              >
                <div className="aspect-video animate-pulse bg-muted" />
                <div className="flex flex-col gap-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-4 rounded-xl border border-border bg-card p-4">
            <div className="mb-3 h-5 w-28 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded-lg bg-muted" />
            <div className="mt-4 h-10 w-full animate-pulse rounded bg-muted" />
          </div>
        </aside>
      </div>
    </main>
  );
}
