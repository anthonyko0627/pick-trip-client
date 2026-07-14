"use client";

import {
  CATEGORY_LABELS,
  CONTENT_CATEGORIES,
  type ContentCategory,
} from "@/types/content";

interface ContentFilterProps {
  selectedCategories: ContentCategory[];
  keyword: string;
  onCategoryChange: (categories: ContentCategory[]) => void;
  onKeywordChange: (keyword: string) => void;
}

export function ContentFilter({
  selectedCategories,
  keyword,
  onCategoryChange,
  onKeywordChange,
}: ContentFilterProps) {
  function toggleCategory(category: ContentCategory) {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {CONTENT_CATEGORIES.map((category) => {
          const selected = selectedCategories.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleCategory(category)}
              className={
                selected
                  ? "rounded-full border border-primary bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
                  : "rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/40"
              }
            >
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      <input
        type="search"
        placeholder="콘텐츠 검색"
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
