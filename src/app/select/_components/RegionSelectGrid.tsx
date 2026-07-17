"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { REGIONS, type Region } from "@/types/region";

import { RegionCard } from "./RegionCard";

export function RegionSelectGrid() {
  const router = useRouter();
  const [selected, setSelected] = useState<Region[]>([]);

  function handleToggle(region: Region) {
    setSelected((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region],
    );
  }

  function handleNext() {
    if (selected.length === 0) return;
    router.push(`/select/conditions?regions=${selected.join(",")}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-medium text-muted-foreground">지역 선택</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {REGIONS.map((region) => (
          <RegionCard
            key={region}
            region={region}
            selected={selected.includes(region)}
            onToggle={handleToggle}
          />
        ))}
      </div>
      <Button
        size="lg"
        disabled={selected.length === 0}
        onClick={handleNext}
        className="mt-2 w-full sm:w-auto sm:self-end"
      >
        다음
      </Button>
    </div>
  );
}
