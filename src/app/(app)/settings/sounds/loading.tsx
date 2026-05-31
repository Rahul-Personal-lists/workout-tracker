import { DetailHeaderSkeleton, Shimmer } from "../skeletons";

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 space-y-3">
      <Shimmer className="h-4 w-40" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Shimmer key={i} className="h-11 rounded-md" />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading sounds">
      <DetailHeaderSkeleton />
      <Shimmer className="h-3 w-48" />
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
