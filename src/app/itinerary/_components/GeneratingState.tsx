import { Icon } from "@/components/ui/icon";

export function GeneratingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-amber-100 border-t-amber-500" />
        <Icon name="wand" size={24} className="text-amber-500" />
      </div>
      <div className="text-center">
        <p className="font-medium text-foreground">
          AI가 일정을 생성하고 있습니다
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          약 30초 정도 소요될 수 있습니다
        </p>
      </div>
    </div>
  );
}
