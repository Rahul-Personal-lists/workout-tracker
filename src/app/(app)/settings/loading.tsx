export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <header>
        <div className="h-8 w-28 rounded bg-surface-subtle animate-pulse" />
      </header>

      <section className="space-y-2">
        <div className="h-3 w-14 rounded bg-surface-subtle animate-pulse" />
        <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
        <div className="rounded-md border border-border bg-surface p-4 space-y-1.5">
          <div className="h-2.5 w-20 rounded bg-surface-subtle animate-pulse" />
          <div className="h-4 w-44 rounded bg-surface-subtle animate-pulse" />
        </div>
        <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
      </section>

      <section className="space-y-2">
        <div className="h-3 w-20 rounded bg-surface-subtle animate-pulse" />
        <div className="rounded-md border border-border bg-surface p-4 space-y-2">
          <div className="h-4 w-24 rounded bg-surface-subtle animate-pulse" />
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-md bg-surface-subtle animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
      </section>
    </div>
  );
}
