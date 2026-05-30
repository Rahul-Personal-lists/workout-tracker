"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProgressBucket } from "@/lib/queries";

type ChartPoint = {
  label: string;
  workouts: number;
};

export function ProgressBarChart({ buckets }: { buckets: ProgressBucket[] }) {
  const data: ChartPoint[] = buckets.map((b) => ({
    label: b.label,
    workouts: b.workouts,
  }));

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
      <div className="px-1">
        <h3 className="text-xs uppercase tracking-wide text-foreground-muted">
          Workouts
        </h3>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 4, left: 0 }}
            barCategoryGap="25%"
          >
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--color-foreground-muted)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              interval={0}
            />
            <YAxis
              stroke="var(--color-foreground-muted)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              width={28}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{
                fill: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
              }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-foreground-muted)" }}
              formatter={(value: number) => [value, "Workouts"]}
            />
            <Bar
              dataKey="workouts"
              fill="var(--color-accent)"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
