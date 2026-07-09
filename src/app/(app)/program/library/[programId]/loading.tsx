export default function Loading() {
  return (
    <div className="space-y-5 pb-4" aria-busy="true" aria-label="Loading program">
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="h-6 w-48 rounded bg-surface-subtle animate-pulse" />
      </header>
      <div className="aspect-[3/2] w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-surface-subtle animate-pulse" />
      <section className="space-y-2">
        <div className="h-5 w-24 rounded bg-surface-subtle animate-pulse" />
        <ul className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-2.5 w-12 rounded bg-surface-subtle animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-surface-subtle animate-pulse" />
                <div className="h-3 w-20 rounded bg-surface-subtle animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="sticky bottom-20 z-30 -mx-4 px-4 py-2">
        <div className="h-12 w-full rounded-md bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
