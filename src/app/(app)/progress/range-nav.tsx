import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RangeKind } from "@/lib/progress-range";

export function RangeNav({
  range,
  label,
  prevAnchor,
  nextAnchor,
}: {
  range: RangeKind;
  label: string;
  prevAnchor: string | null;
  nextAnchor: string | null;
}) {
  const prevHref = prevAnchor ? `/progress?range=${range}&anchor=${prevAnchor}` : null;
  const nextHref = nextAnchor ? `/progress?range=${range}&anchor=${nextAnchor}` : null;

  return (
    <div className="flex items-center justify-between gap-2">
      <ChevronButton href={prevHref} dir="prev" />
      <h2 className="text-base font-medium tabular-nums">{label}</h2>
      <ChevronButton href={nextHref} dir="next" />
    </div>
  );
}

function ChevronButton({
  href,
  dir,
}: {
  href: string | null;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const label = dir === "prev" ? "Previous range" : "Next range";
  const base =
    "h-9 w-9 inline-flex items-center justify-center rounded-full border border-border";
  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  if (!href) {
    return (
      <span
        aria-hidden="true"
        className={cn(base, "text-foreground-muted opacity-30 pointer-events-none")}
      >
        <Icon className="w-4 h-4" />
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className={cn(base, focusRing, "text-foreground-muted hover:text-foreground")}
    >
      <Icon className="w-4 h-4" />
    </Link>
  );
}
