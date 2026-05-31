import { DetailHeaderSkeleton, RowCardSkeleton, Shimmer } from "../skeletons";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading profile">
      <DetailHeaderSkeleton />
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="w-24 h-24 rounded-full bg-surface-subtle animate-pulse" />
          <Shimmer className="h-3 w-28" />
        </div>
        <RowCardSkeleton rows={6} />
        <Shimmer className="h-11 w-full rounded-md" />
        <div className="grid gap-2 pt-2">
          <Shimmer className="h-11 w-full rounded-md" />
          <Shimmer className="h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
