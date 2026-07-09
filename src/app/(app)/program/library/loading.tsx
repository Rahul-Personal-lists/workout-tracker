export default function Loading() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="Loading program library"
    >
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 space-y-1.5">
          <div className="h-6 w-40 rounded bg-surface-subtle animate-pulse" />
          <div className="h-3 w-56 rounded bg-surface-subtle animate-pulse" />
        </div>
      </header>
      {Array.from({ length: 2 }).map((_, g) => (
        <section key={g} className="space-y-2">
          <div className="h-4 w-32 rounded bg-surface-subtle animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/2] w-full rounded-2xl border border-border bg-surface-subtle animate-pulse"
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
