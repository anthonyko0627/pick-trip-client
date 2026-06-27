import type { BasketItem, BasketPriority } from "@/types/basket";
import { PRIORITY_LABELS } from "@/types/basket";
import type { Region } from "@/types/region";
import { REGION_LABELS } from "@/types/region";
import type { CompanionCondition } from "@/types/travel-condition";
import { COMPANION_CONDITION_LABELS } from "@/types/travel-condition";

interface TripSummaryProps {
  regions: Region[];
  startDate: string;
  nights: number;
  companions: CompanionCondition[];
  items: BasketItem[];
}

const PRIORITY_ORDER: (BasketPriority | null)[] = [
  "MUST",
  "SHOULD",
  "OPTIONAL",
  null,
];

export function TripSummary({
  regions,
  startDate,
  nights,
  companions,
  items,
}: TripSummaryProps) {
  const parts = startDate.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const formattedDate = `${month}월 ${day}일`;
  const duration = nights === 0 ? "당일치기" : `${nights}박 ${nights + 1}일`;
  const regionText = regions.map((r) => REGION_LABELS[r]).join(", ");

  const groupedItems = PRIORITY_ORDER.map((priority) => ({
    priority,
    items: items.filter((item) => item.priority === priority),
  })).filter(({ items: groupItems }) => groupItems.length > 0);

  return (
    <section className="rounded-lg border p-4">
      <h2 className="text-lg font-bold">여행 요약</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="font-medium text-gray-700">지역</dt>
          <dd>{regionText}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">날짜</dt>
          <dd>{formattedDate}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">기간</dt>
          <dd>{duration}</dd>
        </div>
        {companions.length > 0 && (
          <div>
            <dt className="font-medium text-gray-700">동행 조건</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {companions.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-xs"
                >
                  {COMPANION_CONDITION_LABELS[c]}
                </span>
              ))}
            </dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-gray-700">담은 콘텐츠</dt>
          {items.length === 0 ? (
            <dd className="text-gray-400">담은 콘텐츠가 없습니다</dd>
          ) : (
            <dd className="mt-1 space-y-2">
              {groupedItems.map(({ priority, items: groupItems }) => (
                <div key={priority ?? "none"}>
                  <span className="text-xs font-medium text-gray-500">
                    {priority ? PRIORITY_LABELS[priority] : "미분류"}
                  </span>
                  <ul className="mt-0.5 space-y-0.5">
                    {groupItems.map((item) => (
                      <li key={item.content.id} className="text-sm">
                        {item.content.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </dd>
          )}
        </div>
      </dl>
    </section>
  );
}
