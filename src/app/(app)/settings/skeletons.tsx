import { cn } from "@/lib/utils";

// Shared building blocks for the settings loading skeletons. Each subpage has
// its own loading.tsx (so navigation shows a correctly-shaped skeleton, not the
// generic hub one), but they all share the identical back-button + title header
// — so it lives here once rather than copied five times.

export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("rounded bg-surface-subtle animate-pulse", className)} />
  );
}

export function DetailHeaderSkeleton() {
  return (
    <header className="flex items-center gap-3">
      <div className="h-9 w-9 rounded-full bg-surface-subtle animate-pulse" />
      <Shimmer className="h-7 w-32" />
    </header>
  );
}

// Card matching the rounded surface + divide-y row list used across settings
// (units, the profile field group). `rows` defaults to one h-14 row.
export function RowCardSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 h-14">
          <Shimmer className="h-3 w-16" />
          <div className="flex-1" />
          <Shimmer className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
