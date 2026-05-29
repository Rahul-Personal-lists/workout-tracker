export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading progress">
      <header className="flex items-center justify-between gap-3">
        <div className="h-8 w-28 rounded bg-surface-subtle animate-pulse" />
        <div className="h-6 w-24 rounded-full border border-border bg-surface animate-pulse" />
      </header>

      <div className="flex items-center gap-1 rounded-full border border-border bg-surface-subtle p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-9 rounded-full bg-surface animate-pulse"
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="h-8 w-8 rounded-md bg-surface-subtle animate-pulse" />
        <div className="h-4 w-40 rounded bg-surface-subtle animate-pulse" />
        <div className="h-8 w-8 rounded-md bg-surface-subtle animate-pulse" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2"
          >
            <div className="h-4 w-4 rounded bg-surface-subtle animate-pulse" />
            <div className="h-8 w-16 rounded bg-surface-subtle animate-pulse" />
            <div className="h-3 w-20 rounded bg-surface-subtle animate-pulse" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="h-48 w-full rounded bg-surface-subtle animate-pulse" />
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="h-64 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
