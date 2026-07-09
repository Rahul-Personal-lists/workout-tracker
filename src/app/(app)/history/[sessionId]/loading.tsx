export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workout">
      <div className="h-5 w-24 rounded bg-surface-subtle animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-48 rounded bg-surface-subtle animate-pulse" />
        <div className="h-6 w-56 rounded bg-surface-subtle animate-pulse" />
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-5 w-14 rounded bg-surface-subtle animate-pulse" />
              <div className="h-2.5 w-10 rounded bg-surface-subtle animate-pulse" />
            </div>
          ))}
        </div>
      </header>
      <ul className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="rounded-2xl border border-border bg-surface p-3 space-y-2"
          >
            <div className="h-4 w-2/3 rounded bg-surface-subtle animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-surface-subtle animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-surface-subtle animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}
