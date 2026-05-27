"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function DayTabs({
  days,
  selectedDayId,
  selectedWeek,
}: {
  days: { id: string; label: string }[];
  selectedDayId: string;
  selectedWeek: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>(
      '[data-selected="true"]'
    );
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [selectedDayId]);

  const idx = days.findIndex((d) => d.id === selectedDayId);
  const next = idx >= 0 && idx < days.length - 1 ? days[idx + 1] : null;

  return (
    <div ref={ref} className="-mx-4 px-4 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max justify-center">
        {days.map((day) => {
          const isSelected = day.id === selectedDayId;
          return (
            <Link
              key={day.id}
              href={`/program?week=${selectedWeek}&day=${day.id}`}
              scroll={false}
              data-selected={isSelected ? "true" : undefined}
              className={cn(
                "h-9 px-4 rounded-full inline-flex items-center justify-center text-sm font-medium border shrink-0 whitespace-nowrap",
                isSelected
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-foreground-muted"
              )}
            >
              {day.label}
            </Link>
          );
        })}
        <Link
          href={
            next
              ? `/program?week=${selectedWeek}&day=${next.id}`
              : `/program?week=${selectedWeek}&day=${days[0]?.id ?? ""}`
          }
          scroll={false}
          aria-label="Next day"
          aria-disabled={!next}
          tabIndex={next ? 0 : -1}
          className={cn(
            "h-9 w-9 inline-flex items-center justify-center rounded-full border border-border text-foreground-muted shrink-0",
            !next && "opacity-40 pointer-events-none"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
