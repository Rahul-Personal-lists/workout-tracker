"use client";

import { format } from "date-fns";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BodyPoint = {
  date: string;
  weight: number | null;
  calories: number | null;
  ema: number | null;
};

export function BodyChart({
  data,
  goalWeight,
}: {
  data: BodyPoint[];
  goalWeight: number | null;
}) {
  const rows = data.map((p) => ({
    ...p,
    label: format(new Date(p.date + "T00:00:00"), "MMM d"),
  }));

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
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
              domain={[
                (dataMin: number) =>
                  Math.min(dataMin, goalWeight ?? dataMin) - 1,
                (dataMax: number) =>
                  Math.max(dataMax, goalWeight ?? dataMax) + 1,
              ]}
              width={48}
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
              formatter={(value, name) => {
                if (value === null || value === undefined) return ["—", ""];
                const num = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(num)) return ["—", ""];
                if (name === "ema") return [`${num.toFixed(1)} lb`, "Trend"];
                return [`${num} lb`, "Weight"];
              }}
            />
            {goalWeight !== null ? (
              <ReferenceLine
                y={goalWeight}
                stroke="var(--color-accent)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `Goal ${goalWeight}`,
                  fill: "var(--color-accent)",
                  fontSize: 10,
                  position: "insideBottomRight",
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="weight"
              stroke="var(--color-foreground-muted)"
              strokeWidth={1}
              strokeOpacity={0.5}
              dot={{ fill: "var(--color-foreground-muted)", r: 2 }}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ema"
              stroke="var(--color-accent)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
