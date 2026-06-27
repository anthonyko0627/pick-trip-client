export function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-700" />
      <div className="text-center">
        <p className="font-medium">AI가 일정을 생성하고 있습니다</p>
        <p className="mt-1 text-sm text-gray-500">
          약 30초 정도 소요될 수 있습니다
        </p>
      </div>
    </div>
  );
}
