"use client";

import dynamic from "next/dynamic";

export const MetricChartLazy = dynamic(
  () => import("./body-chart").then((m) => m.MetricChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="h-56 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    ),
  }
);
