"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useBasket } from "@/hooks/useBasket";
import {
  CATEGORY_LABELS,
  CONTENT_CATEGORIES,
  type Content,
  type ContentCategory,
} from "@/types/content";

import { BasketDrawer } from "./BasketDrawer";
import { BasketFab } from "./BasketFab";
import { BasketPanel } from "./BasketPanel";
import { ContentCard } from "./ContentCard";
import { ContentFilter } from "./ContentFilter";

const UNCATEGORIZED_LABEL = "기타";

interface ContentGroup {
  key: string;
  label: string;
  items: Content[];
}

// CONTENT_CATEGORIES 순서대로 묶고, category가 없는 콘텐츠는 마지막에 "기타"로 모은다.
function groupByCategory(contents: Content[]): ContentGroup[] {
  const groups: ContentGroup[] = CONTENT_CATEGORIES.map((category) => ({
    key: category,
    label: CATEGORY_LABELS[category],
    items: contents.filter((c) => c.category === category),
  })).filter((group) => group.items.length > 0);

  const uncategorized = contents.filter((c) => c.category === undefined);
  if (uncategorized.length > 0) {
    groups.push({
      key: "uncategorized",
      label: UNCATEGORIZED_LABEL,
      items: uncategorized,
    });
  }

  return groups;
}

interface ContentGridProps {
  initialContents: Content[];
  itineraryHref: string;
}

export function ContentGrid({
  initialContents,
  itineraryHref,
}: ContentGridProps) {
  const [selectedCategories, setSelectedCategories] = useState<
    ContentCategory[]
  >([]);
  const [keyword, setKeyword] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { items, add, remove, isInBasket, setPriority, clear } = useBasket();
  const router = useRouter();

  const filtered = initialContents.filter((c) => {
    const matchCategory =
      selectedCategories.length === 0 ||
      (c.category !== undefined && selectedCategories.includes(c.category));
    const q = keyword.trim().toLowerCase();
    const matchKeyword =
      q === "" ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q);
    return matchCategory && matchKeyword;
  });

  if (initialContents.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        콘텐츠가 없습니다
      </p>
    );
  }

  return (
    <>
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-6">
            <ContentFilter
              selectedCategories={selectedCategories}
              keyword={keyword}
              onCategoryChange={setSelectedCategories}
              onKeywordChange={setKeyword}
            />

            {filtered.length === 0 ? (
              <p className="flex min-h-[60vh] items-center justify-center text-center text-sm text-muted-foreground">
                조건에 맞는 콘텐츠가 없습니다
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {filtered.length}개 결과
                </p>
                <div className="flex flex-col gap-8">
                  {groupByCategory(filtered).map((group) => (
                    <section key={group.key}>
                      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-foreground">
                        {group.label}
                        <span className="text-sm font-normal text-muted-foreground">
                          {group.items.length}개
                        </span>
                      </h2>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.items.map((content) => (
                          <ContentCard
                            key={content.id}
                            content={content}
                            isInBasket={isInBasket(content.id)}
                            onToggleBasket={() =>
                              isInBasket(content.id)
                                ? remove(content.id)
                                : add(content)
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 lg:block">
          <BasketPanel
            items={items}
            onRemove={remove}
            onSetPriority={setPriority}
            onClear={clear}
            canGenerate={items.length >= 2}
            onGenerate={() => router.push(itineraryHref)}
          />
        </aside>
      </div>

      <BasketFab count={items.length} onOpen={() => setIsDrawerOpen(true)} />
      <BasketDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        items={items}
        onRemove={remove}
        onSetPriority={setPriority}
        onClear={clear}
        canGenerate={items.length >= 2}
        onGenerate={() => router.push(itineraryHref)}
      />
    </>
  );
}
