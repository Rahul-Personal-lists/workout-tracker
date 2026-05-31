import { DetailHeaderSkeleton, Shimmer } from "../skeletons";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading theme">
      <DetailHeaderSkeleton />
      <section className="rounded-md border border-border bg-surface p-4 space-y-3">
        <Shimmer className="h-3 w-16" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Shimmer className="w-full h-12 rounded-md" />
              <Shimmer className="h-2.5 w-8" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
