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
import { formatDuration, unitLabel } from "@/lib/format";
import type { Units } from "@/lib/units";

const LB_PER_KG = 2.20462;

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
            <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="#737373"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#262626" }}
            />
            <YAxis
              stroke="#737373"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#262626" }}
              domain={["auto", "auto"]}
              width={42}
              tickFormatter={(v: number) => (isTime ? formatDuration(v) : String(v))}
            />
            <Tooltip
              cursor={{ stroke: "#404040", strokeWidth: 1 }}
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 6,
                fontSize: 12,
              }}
              labelStyle={{ color: "#a3a3a3" }}
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
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
