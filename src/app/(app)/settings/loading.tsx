import { RowCardSkeleton, Shimmer } from "./skeletons";

function SectionSkeleton({
  labelWidth,
  children,
}: {
  labelWidth: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <Shimmer className={`h-3 ${labelWidth} ml-1`} />
      {children}
    </section>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading settings">
      <header>
        <Shimmer className="h-8 w-28" />
      </header>

      {/* Profile */}
      <SectionSkeleton labelWidth="w-14">
        <RowCardSkeleton rows={1} />
      </SectionSkeleton>

      {/* Body — goal weight field */}
      <SectionSkeleton labelWidth="w-10">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <div className="rounded-md border border-border bg-surface-subtle p-4 space-y-2">
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-4 w-20" />
          </div>
        </div>
      </SectionSkeleton>

      {/* Preferences — Units / Sounds / Theme */}
      <SectionSkeleton labelWidth="w-24">
        <RowCardSkeleton rows={3} />
      </SectionSkeleton>

      {/* Help */}
      <SectionSkeleton labelWidth="w-10">
        <RowCardSkeleton rows={1} />
      </SectionSkeleton>

      {/* About */}
      <SectionSkeleton labelWidth="w-12">
        <RowCardSkeleton rows={1} />
      </SectionSkeleton>
    </div>
  );
}
