export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading exercises">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-6 w-28 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-48 rounded bg-surface-subtle animate-pulse" />
        </div>
        <div className="h-9 w-32 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
      </header>
      <div className="h-64 w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl border border-border bg-surface-subtle animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
