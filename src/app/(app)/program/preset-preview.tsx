"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  estimatePlanStats,
  formatStarterSets,
  starterToEstimate,
} from "@/lib/estimates";
import { PlanStats } from "@/components/plan-stats";
import type { PresetProgram } from "@/lib/starter-program";

export function PresetPreview({
  preset,
  weightLb,
}: {
  preset: PresetProgram;
  weightLb: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] text-foreground-muted hover:text-foreground"
      >
        <ChevronDown
          className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")}
        />
        {open ? "Hide preview" : "Preview workouts"}
      </button>

      {open ? (
        <ul className="mt-2 space-y-2">
          {preset.days.map((d) => (
            <li
              key={d.day_number}
              className="rounded-md border border-border bg-background/40 p-2.5"
            >
              <p className="text-[11px] font-medium text-foreground-muted">
                {d.label} · {d.title}
              </p>
              {d.exercises.length > 0
                ? (() => {
                    const stats = estimatePlanStats(
                      d.exercises.map(starterToEstimate),
                      { weightLb }
                    );
                    return (
                      <PlanStats
                        exerciseCount={stats.count}
                        durationSec={stats.durationSec}
                        calories={stats.calories}
                        className="mt-1"
                      />
                    );
                  })()
                : null}
              <ul className="mt-1 space-y-0.5">
                {d.exercises.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-2 text-[11px] text-foreground-muted"
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="shrink-0 tabular-nums">{formatStarterSets(e)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
