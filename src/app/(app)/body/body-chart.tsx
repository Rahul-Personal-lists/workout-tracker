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

export type MetricPoint = {
  date: string;
  value: number | null;
  ema: number | null;
};

export function MetricChart({
  data,
  toDisplay,
  unitSuffix,
  decimals = 1,
  pad = 1,
  goalValue = null,
  goalLabel,
}: {
  data: MetricPoint[];
  /** Maps a canonical stored value to the display unit. */
  toDisplay: (canonical: number) => number;
  unitSuffix: string;
  decimals?: number;
  pad?: number;
  goalValue?: number | null;
  goalLabel?: string;
}) {
  const rows = data.map((p) => ({
    ...p,
    value: p.value !== null ? toDisplay(p.value) : null,
    ema: p.ema !== null ? toDisplay(p.ema) : null,
    label: format(new Date(p.date + "T00:00:00"), "MMM d"),
  }));
  const goalDisplay = goalValue !== null ? toDisplay(goalValue) : null;

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
                  Math.min(dataMin, goalDisplay ?? dataMin) - pad,
                (dataMax: number) =>
                  Math.max(dataMax, goalDisplay ?? dataMax) + pad,
              ]}
              tickFormatter={(v: number) => v.toFixed(decimals)}
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
                const text = `${num.toFixed(decimals)} ${unitSuffix}`.trim();
                if (name === "ema") return [text, "Trend"];
                return [text, "Value"];
              }}
            />
            {goalDisplay !== null && goalLabel ? (
              <ReferenceLine
                y={goalDisplay}
                stroke="var(--color-accent)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: goalLabel,
                  fill: "var(--color-accent)",
                  fontSize: 10,
                  position: "insideBottomRight",
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
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
