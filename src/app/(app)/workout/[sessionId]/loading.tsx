export default function Loading() {
  return (
    <div className="space-y-5 pb-28" aria-busy="true" aria-label="Loading workout">
      <header className="space-y-1.5">
        <div className="h-3 w-32 rounded bg-surface-subtle animate-pulse" />
        <div className="flex items-center justify-between gap-3">
          <div className="h-6 w-48 rounded bg-surface-subtle animate-pulse" />
          <div className="h-4 w-12 rounded bg-surface-subtle animate-pulse" />
        </div>
        <div className="h-3 w-24 rounded bg-surface-subtle animate-pulse" />
      </header>

      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="rounded-2xl border border-border bg-surface p-3 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 shrink-0 rounded-md bg-surface-subtle animate-pulse" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="h-4 w-2/3 rounded bg-surface-subtle animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-10 w-full rounded-md bg-surface-subtle animate-pulse" />
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] px-4">
        <div className="max-w-md mx-auto h-12 rounded-md bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
