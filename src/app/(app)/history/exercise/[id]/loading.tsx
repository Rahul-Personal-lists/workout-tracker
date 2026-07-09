export default function Loading() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading exercise progress"
    >
      <div className="h-5 w-24 rounded bg-surface-subtle animate-pulse" />
      <header className="space-y-2">
        <div className="h-3 w-32 rounded bg-surface-subtle animate-pulse" />
        <div className="h-6 w-52 rounded bg-surface-subtle animate-pulse" />
        <div className="h-4 w-40 rounded bg-surface-subtle animate-pulse" />
      </header>
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="h-64 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    </div>
  );
}
