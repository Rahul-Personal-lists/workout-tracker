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
import { formatWeightShort } from "@/lib/format";
import type { Units } from "@/lib/units";

export type BodyPoint = {
  date: string;
  weight: number | null;
  calories: number | null;
  ema: number | null;
};

const LB_PER_KG = 2.20462;

function toDisplayWeight(lb: number, units: Units): number {
  return units === "metric" ? lb / LB_PER_KG : lb;
}

export function BodyChart({
  data,
  goalWeight,
  units,
}: {
  data: BodyPoint[];
  goalWeight: number | null;
  units: Units;
}) {
  const rows = data.map((p) => ({
    ...p,
    weight: p.weight !== null ? toDisplayWeight(p.weight, units) : null,
    ema: p.ema !== null ? toDisplayWeight(p.ema, units) : null,
    label: format(new Date(p.date + "T00:00:00"), "MMM d"),
  }));
  const goalDisplay =
    goalWeight !== null ? toDisplayWeight(goalWeight, units) : null;

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
                  Math.min(dataMin, goalDisplay ?? dataMin) - 1,
                (dataMax: number) =>
                  Math.max(dataMax, goalDisplay ?? dataMax) + 1,
              ]}
              tickFormatter={(v: number) => v.toFixed(1)}
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
                const suffix = units === "metric" ? "kg" : "lb";
                if (name === "ema") return [`${num.toFixed(1)} ${suffix}`, "Trend"];
                return [`${num.toFixed(1)} ${suffix}`, "Weight"];
              }}
            />
            {goalDisplay !== null && goalWeight !== null ? (
              <ReferenceLine
                y={goalDisplay}
                stroke="var(--color-accent)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: `Goal ${formatWeightShort(goalWeight, units)}`,
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
