export default function Loading() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Loading new exercise form"
    >
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 space-y-1.5">
          <div className="h-6 w-48 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-56 rounded bg-surface-subtle animate-pulse" />
        </div>
      </header>
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 w-full rounded-2xl border border-border bg-surface-subtle animate-pulse"
          />
        ))}
      </div>
      <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
    </div>
  );
}
