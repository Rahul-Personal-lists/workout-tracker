"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDuration, LB_PER_KG, unitLabel } from "@/lib/format";
import type { Units } from "@/lib/units";

export type ChartPoint = {
  date: string;
  value: number;
  reps: number | null;
};

export function ExerciseChart({
  points,
  isTime = false,
  units,
}: {
  points: ChartPoint[];
  isTime?: boolean;
  units: Units;
}) {
  const data = points.map((p) => ({
    ...p,
    value: isTime ? p.value : units === "metric" ? p.value / LB_PER_KG : p.value,
    ts: new Date(p.date).getTime(),
    label: format(new Date(p.date), "MMM d"),
  }));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="var(--color-foreground-muted)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
            />
            <YAxis
              stroke="var(--color-foreground-muted)"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-border)" }}
              domain={["auto", "auto"]}
              width={42}
              tickFormatter={(v: number) => (isTime ? formatDuration(v) : String(v))}
            />
            <Tooltip
              cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-foreground-muted)" }}
              formatter={(value: number, _name, payload) => {
                if (isTime) {
                  return [formatDuration(value), "Top time"];
                }
                const reps = payload?.payload?.reps;
                const display = `${value.toFixed(1)} ${unitLabel(units)}${reps ? ` × ${reps}` : ""}`;
                return [display, "Top set"];
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ fill: "var(--color-accent)", r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
