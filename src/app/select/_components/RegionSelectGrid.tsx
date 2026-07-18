"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useBasket } from "@/hooks/useBasket";
import { REGIONS, type Region } from "@/types/region";

import { RegionCard } from "./RegionCard";

export function RegionSelectGrid() {
  const router = useRouter();
  const [selected, setSelected] = useState<Region[]>([]);
  const { clear } = useBasket();

  // Step 1(지역 선택) 진입은 새 여행 계획의 시작점이므로, 이전 계획에서
  // 남은 바구니를 비운다. /contents 내부 이동(상세 보기 등)은 이 컴포넌트를
  // 다시 마운트하지 않으므로 영향받지 않는다.
  useEffect(() => {
    clear();
  }, [clear]);

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
