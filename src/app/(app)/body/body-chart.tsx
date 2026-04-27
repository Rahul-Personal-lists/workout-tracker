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

export type BodyPoint = {
  date: string;
  weight: number;
  calories: number | null;
};

export function BodyChart({ data }: { data: BodyPoint[] }) {
  const rows = data.map((p) => ({
    ...p,
    label: format(new Date(p.date + "T00:00:00"), "MMM d"),
  }));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 8, bottom: 4, left: -16 }}>
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
                const cal = payload?.payload?.calories;
                return [
                  `${value} lb${cal !== null && cal !== undefined ? ` · ${cal.toLocaleString()} cal` : ""}`,
                  "",
                ];
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
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
