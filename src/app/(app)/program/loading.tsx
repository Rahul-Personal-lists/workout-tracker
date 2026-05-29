export default function Loading() {
  return (
    <div className="space-y-5 pb-4" aria-busy="true" aria-label="Loading program">
      <div className="flex items-center justify-between gap-2">
        <div className="h-9 w-36 rounded-md border border-border bg-surface animate-pulse" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-surface-subtle animate-pulse shrink-0" />
          <div className="flex-1 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-12 rounded-full bg-surface-subtle animate-pulse shrink-0"
              />
            ))}
          </div>
          <div className="h-9 w-9 rounded-md bg-surface-subtle animate-pulse shrink-0" />
        </div>

        <div className="flex items-start justify-between gap-2">
          <span className="w-9 shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-center space-y-1.5">
            <div className="h-3 w-20 mx-auto rounded bg-surface-subtle animate-pulse" />
            <div className="h-5 w-44 mx-auto rounded bg-surface-subtle animate-pulse" />
            <div className="h-3 w-24 mx-auto rounded bg-surface-subtle animate-pulse" />
          </div>
          <div className="h-9 w-9 rounded-md bg-surface-subtle animate-pulse shrink-0" />
        </div>
      </div>

      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
          >
            <div className="w-10 h-10 shrink-0 rounded-full bg-surface-subtle animate-pulse" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-surface-subtle animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
            </div>
          </li>
        ))}
      </ul>

      <div className="h-12 w-full rounded-md bg-surface-subtle animate-pulse" />
    </div>
  );
}
