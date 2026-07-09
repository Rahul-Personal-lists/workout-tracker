import Link from "next/link";
import { cn } from "@/lib/utils";
import { NavPending } from "@/components/nav-pending";
import type { RangeKind } from "@/lib/progress-range";

const TABS: Array<{ id: RangeKind; label: string }> = [
  { id: "last", label: "Last" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Yearly" },
];

export function RangeTabs({
  active,
  anchorForRange,
}: {
  active: RangeKind;
  anchorForRange: Record<RangeKind, string | null>;
}) {
  return (
    <div
      role="tablist"
      aria-label="Progress range"
      className="flex items-center gap-1 rounded-full border border-border bg-surface-subtle p-1"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        const anchor = anchorForRange[t.id];
        const href = anchor ? `/progress?range=${t.id}&anchor=${anchor}` : `/progress?range=${t.id}`;
        return (
          <Link
            key={t.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              "flex-1 h-9 inline-flex items-center justify-center text-sm font-medium rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-foreground-muted hover:text-foreground"
            )}
          >
            <NavPending>{t.label}</NavPending>
          </Link>
        );
      })}
    </div>
  );
}
