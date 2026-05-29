"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresetProgram } from "@/lib/starter-program";

function setsLabel(e: PresetProgram["days"][number]["exercises"][number]) {
  if (e.kind === "time" && e.target_seconds) return `${e.sets} × ${e.target_seconds}s`;
  if (e.base_reps) return `${e.sets} × ${e.base_reps}`;
  return `${e.sets} sets`;
}

export function PresetPreview({ preset }: { preset: PresetProgram }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200"
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
              className="rounded-md border border-neutral-800 bg-neutral-950/40 p-2.5"
            >
              <p className="text-[11px] font-medium text-neutral-300">
                {d.label} · {d.title}
              </p>
              <ul className="mt-1 space-y-0.5">
                {d.exercises.map((e, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-2 text-[11px] text-neutral-500"
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="shrink-0 tabular-nums">{setsLabel(e)}</span>
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
