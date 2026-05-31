import { DetailHeaderSkeleton, RowCardSkeleton } from "../skeletons";

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading units">
      <DetailHeaderSkeleton />
      <RowCardSkeleton rows={2} />
    </div>
  );
}
