export default function Loading() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="h-4 w-56 rounded bg-gray-200" />
        <div className="mt-6 space-y-3">
          <div className="h-24 rounded-lg border bg-gray-100" />
          <div className="h-24 rounded-lg border bg-gray-100" />
        </div>
      </div>
    </main>
  );
}
