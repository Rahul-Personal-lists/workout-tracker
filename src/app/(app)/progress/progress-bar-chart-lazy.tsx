"use client";

import dynamic from "next/dynamic";

// Recharts is ~100KB min+gz — load it after the page is interactive. The
// fallback mirrors ProgressBarChart's container so nothing shifts.
export const ProgressBarChartLazy = dynamic(
  () => import("./progress-bar-chart").then((m) => m.ProgressBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
        <div className="px-1">
          <div className="h-3 w-16 rounded bg-surface-subtle animate-pulse" />
        </div>
        <div className="h-48 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    ),
  }
);
