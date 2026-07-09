"use client";

import dynamic from "next/dynamic";

export const ExerciseChartLazy = dynamic(
  () => import("./exercise-chart").then((m) => m.ExerciseChart),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="h-64 w-full rounded bg-surface-subtle animate-pulse" />
      </div>
    ),
  }
);
