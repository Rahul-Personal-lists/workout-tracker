"use client";

import { cn } from "@/lib/utils";
import type { Range } from "@/lib/body-stats";

const TABS: Array<{ id: Range; label: string }> = [
  { id: "1m", label: "1M" },
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "all", label: "All" },
];

export function BodyRangeTabs({
  active,
  onChange,
}: {
  active: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Chart range"
      className="flex items-center gap-1 rounded-full border border-border bg-surface-subtle p-1"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex-1 h-9 inline-flex items-center justify-center text-sm font-medium rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-foreground-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
