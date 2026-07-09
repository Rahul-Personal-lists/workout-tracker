export default function Loading() {
  return (
    <div
      className="space-y-5 pb-4"
      aria-busy="true"
      aria-label="Loading workout day"
    >
      <header className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
        <div className="min-w-0 space-y-1.5">
          <div className="h-2.5 w-12 rounded bg-surface-subtle animate-pulse" />
          <div className="h-6 w-44 rounded bg-surface-subtle animate-pulse" />
        </div>
      </header>
      <div className="flex items-center gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 w-16 rounded-full bg-surface-subtle animate-pulse shrink-0"
          />
        ))}
      </div>
      <div className="h-16 w-full rounded-2xl border border-border bg-surface-subtle animate-pulse" />
      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <div className="w-10 h-10 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
            <div className="w-[30px] h-[30px] shrink-0 rounded bg-surface-subtle animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-surface-subtle animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-20 z-30 -mx-4 px-4 py-2">
        <div className="h-12 w-full rounded-md bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
