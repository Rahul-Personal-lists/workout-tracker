import { DetailHeaderSkeleton, Shimmer } from "../skeletons";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading help">
      <DetailHeaderSkeleton />
      <div className="space-y-2">
        <Shimmer className="h-10 w-full rounded-xl" />
        <Shimmer className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
