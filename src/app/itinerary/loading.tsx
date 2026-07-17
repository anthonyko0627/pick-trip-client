export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="animate-pulse space-y-4">
        {/* 여행 요약 카드 스켈레톤 */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="h-6 w-24 rounded bg-gray-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-4 w-36 rounded bg-gray-200" />
          </div>
        </div>
        {/* 버튼 영역 스켈레톤 */}
        <div className="h-9 w-32 rounded-4xl bg-gray-200" />
      </div>
    </main>
  );
}
