"use client";

import { ChevronRight } from "lucide-react";
import type { Units } from "@/lib/units";
import type { MetricConfig, MetricKey } from "@/lib/body-metrics";

export type MeasureRow = {
  metric: MetricConfig;
  latest: number | null;
  delta: number | null;
};

export function MeasuresList({
  rows,
  units,
  onSelect,
}: {
  rows: MeasureRow[];
  units: Units;
  onSelect: (key: MetricKey) => void;
}) {
  return (
    <ul className="rounded-lg border border-border bg-surface divide-y divide-[color:var(--color-border)]">
      {rows.map(({ metric, latest, delta }) => (
        <li key={metric.key}>
          <button
            type="button"
            onClick={() => onSelect(metric.key)}
            className="w-full flex items-center gap-3 px-3 py-3 text-left"
          >
            <span className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md bg-surface-subtle text-foreground-muted">
              <metric.icon className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm font-medium">{metric.label}</span>
            <span className="text-sm tabular-nums">
              {metric.format(latest, units)}
            </span>
            {delta !== null && delta !== 0 ? (
              <span className="text-xs tabular-nums text-foreground-muted w-12 text-right">
                {metric.formatSigned(delta, units)}
              </span>
            ) : (
              <span className="w-12" />
            )}
            <ChevronRight className="w-4 h-4 text-foreground-muted shrink-0" />
          </button>
        </li>
      ))}
    </ul>
  );
}
