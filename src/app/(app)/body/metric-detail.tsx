"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Units } from "@/lib/units";
import type { MetricConfig } from "@/lib/body-metrics";
import { cn } from "@/lib/utils";
import {
  avgWeight,
  emaSeries,
  padToWindow,
  pointsInDayRange,
  pointsInLastDays,
  predictGoalDate,
  rangeAlphaFor,
  weeklyRateFromEma,
  windowSeries,
  type Range,
} from "@/lib/body-stats";
import { MetricChart, type MetricPoint } from "./body-chart";
import { BodyRangeTabs } from "./range-tabs";

export type MetricSeriesPoint = { date: string; value: number };

export function MetricDetail({
  metric,
  points,
  units,
  goalWeight,
  onBack,
  onQuickAdd,
  onDeleteEntry,
  pending,
  error,
}: {
  metric: MetricConfig;
  points: MetricSeriesPoint[]; // ascending by date, real entries only
  units: Units;
  goalWeight: number | null;
  onBack: () => void;
  onQuickAdd: (valueStr: string) => void;
  onDeleteEntry: (date: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [range, setRange] = useState<Range>("3m");
  const [input, setInput] = useState("");

  const isWeight = metric.kind === "weight";
  const decimals = metric.kind === "count" ? 0 : 1;
  const pad = metric.kind === "count" ? 50 : 1;

  const dw = useMemo(
    () => points.map((p) => ({ date: p.date, weight: p.value })),
    [points]
  );
  const ema = useMemo(
    () => emaSeries(dw, rangeAlphaFor(range)),
    [dw, range]
  );
  const withEma = useMemo<MetricPoint[]>(
    () => points.map((p, i) => ({ date: p.date, value: p.value, ema: ema[i] ?? null })),
    [points, ema]
  );
  const windowed = useMemo<MetricPoint[]>(() => {
    const w = windowSeries(withEma, range);
    return padToWindow<MetricPoint>(
      w,
      (date) => ({ date, value: null, ema: null }),
      range
    );
  }, [withEma, range]);

  const stats = useMemo(() => {
    if (dw.length === 0) return null;
    const last7 = pointsInLastDays(dw, 7);
    const prior7 = pointsInDayRange(dw, 14, 7);
    const avg7 = avgWeight(last7);
    const avg7Prior = avgWeight(prior7);
    const delta = avg7 !== null && avg7Prior !== null ? avg7 - avg7Prior : null;
    const rate = weeklyRateFromEma(dw, ema);
    return { avg7, delta, rate };
  }, [dw, ema]);

  const predictedGoalDate = useMemo(() => {
    if (!isWeight || goalWeight === null || stats === null) return null;
    if (stats.avg7 === null || stats.rate === null) return null;
    return predictGoalDate(stats.avg7, goalWeight, stats.rate);
  }, [isWeight, goalWeight, stats]);

  const desc = useMemo(() => points.slice().reverse(), [points]);

  function submitQuickAdd() {
    if (input.trim() === "") return;
    onQuickAdd(input);
    setInput("");
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to measures"
          className="h-9 w-9 -ml-1 flex items-center justify-center text-foreground-muted outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-surface-subtle text-foreground-muted">
          <metric.icon className="w-4 h-4" />
        </span>
        <h1 className="text-xl font-semibold">{metric.label}</h1>
      </header>

      <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
        <span className="text-[11px] uppercase tracking-wide text-foreground-muted">
          Log today ({metric.unitLabel(units)})
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Enter ${metric.label.toLowerCase()}`}
            aria-label={`${metric.label} (${metric.unitLabel(units)})`}
            className="flex-1 h-11 rounded-md bg-surface-subtle border border-border px-3 text-base tabular-nums outline-none focus:border-border-strong focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          />
          <button
            type="button"
            onClick={submitQuickAdd}
            disabled={pending}
            className={cn(
              "h-11 px-4 rounded-md font-medium text-sm bg-accent text-accent-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
              pending && "opacity-50"
            )}
          >
            Save
          </button>
        </div>
        {error ? <p role="alert" className="text-xs text-red-400">{error}</p> : null}
      </div>

      {points.length >= 2 ? (
        <div className="space-y-3">
          {isWeight && stats ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 tabular-nums">
              <Stat label="7d avg" value={metric.formatShort(stats.avg7, units)} />
              <Stat
                label="Δ vs prior wk"
                value={metric.formatSigned(stats.delta, units)}
                tone={
                  stats.delta !== null && stats.delta < 0
                    ? "good"
                    : stats.delta !== null && stats.delta > 0
                      ? "warn"
                      : undefined
                }
              />
              <Stat
                label={`${metric.unitLabel(units)} / wk`}
                value={metric.formatSigned(stats.rate, units)}
              />
            </div>
          ) : null}
          <BodyRangeTabs active={range} onChange={setRange} />
          <MetricChart
            data={windowed}
            toDisplay={(v) => metric.toDisplay(v, units)}
            unitSuffix={metric.unitLabel(units)}
            decimals={decimals}
            pad={pad}
            goalValue={isWeight ? goalWeight : null}
            goalLabel={
              isWeight && goalWeight !== null
                ? `Goal ${metric.formatShort(goalWeight, units)}`
                : undefined
            }
          />
          {isWeight && goalWeight !== null && stats && stats.avg7 !== null ? (
            <p className="text-xs text-center text-foreground-muted">
              {predictedGoalDate ? (
                <>
                  On pace for{" "}
                  <span className="text-foreground font-medium">
                    {metric.format(goalWeight, units)}
                  </span>{" "}
                  on{" "}
                  <span className="text-foreground font-medium">
                    {format(predictedGoalDate, "MMM d, yyyy")}
                  </span>
                </>
              ) : stats.rate === null ? (
                <>Log more days to see goal pace.</>
              ) : (
                <>Trend not moving toward goal.</>
              )}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-foreground-muted text-center py-4">
          Log at least 2 days to see a trend.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-foreground-muted">
          History
        </h2>
        {desc.length === 0 ? (
          <p className="text-sm text-foreground-muted">No entries yet.</p>
        ) : (
          <ul className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
            {desc.map((p) => (
              <li
                key={p.date}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <div className="w-20 text-foreground-muted tabular-nums text-xs">
                  {format(new Date(p.date + "T00:00:00"), "MMM d")}
                </div>
                <div className="flex-1 tabular-nums font-medium">
                  {metric.format(p.value, units)}
                </div>
                {metric.source === "body_measurements" ? (
                  <button
                    type="button"
                    onClick={() => onDeleteEntry(p.date)}
                    aria-label={`Delete ${p.date}`}
                    className="h-8 w-8 flex items-center justify-center text-foreground-muted outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <span className="w-8" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  return (
    <div>
      <div
        className={cn(
          "text-base",
          tone === "good" && "text-emerald-400",
          tone === "warn" && "text-amber-400"
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
        {label}
      </div>
    </div>
  );
}
