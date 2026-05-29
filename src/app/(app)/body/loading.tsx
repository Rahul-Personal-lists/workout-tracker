export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading body">
      <header className="space-y-1.5">
        <div className="h-8 w-20 rounded bg-surface-subtle animate-pulse" />
        <div className="h-3 w-44 rounded bg-surface-subtle animate-pulse" />
      </header>

      <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
        <div className="space-y-1.5">
          <div className="h-2.5 w-12 rounded bg-surface-subtle animate-pulse" />
          <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="h-2.5 w-16 rounded bg-surface-subtle animate-pulse" />
            <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 rounded bg-surface-subtle animate-pulse" />
            <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
          </div>
        </div>
        <div className="h-11 w-full rounded-md bg-surface-subtle animate-pulse" />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="h-48 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
