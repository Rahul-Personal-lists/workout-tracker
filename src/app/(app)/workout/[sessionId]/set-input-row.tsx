"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatWeightShort,
  parseWeightInput,
  unitLabel,
} from "@/lib/format";
import type { Units } from "@/lib/units";
import { SwipeRow } from "@/components/swipe-row";
import { tapVibration } from "@/lib/step-cue";
import type { SetRow } from "./types";

export function SetInputRow({
  set,
  units,
  lastWeight,
  lastReps,
  onChange,
  onDelete,
}: {
  set: SetRow;
  units: Units;
  lastWeight: number | null;
  lastReps: number | null;
  onChange: (patch: Partial<SetRow>, persist: boolean) => void;
  onDelete: () => void;
}) {
  const [weightStr, setWeightStr] = useState(
    set.actualWeight !== null ? formatWeightShort(set.actualWeight, units) : ""
  );
  const [repsStr, setRepsStr] = useState(
    set.actualReps !== null ? String(set.actualReps) : ""
  );
  const weightStrRef = useRef(weightStr);
  const repsStrRef = useRef(repsStr);
  useEffect(() => {
    weightStrRef.current = weightStr;
  }, [weightStr]);
  useEffect(() => {
    repsStrRef.current = repsStr;
  }, [repsStr]);

  function parseW(str: string): number | null {
    const trimmed = str.trim();
    if (trimmed === "") return null;
    return parseWeightInput(trimmed, units);
  }

  function commitOnBlur() {
    const r = repsStrRef.current.trim();
    const validW = parseW(weightStrRef.current);
    const parsedR = r === "" ? null : parseInt(r, 10);
    const validR = parsedR === null || Number.isFinite(parsedR) ? parsedR : null;
    if (validW !== set.actualWeight || validR !== set.actualReps) {
      onChange(
        { actualWeight: validW, actualReps: validR },
        set.completed // only persist if already marked done
      );
    }
  }

  function toggleComplete() {
    const next = !set.completed;
    const validW = parseW(weightStrRef.current);
    const parsedR = repsStrRef.current.trim() === "" ? null : parseInt(repsStrRef.current, 10);
    const validR = Number.isFinite(parsedR as number) ? (parsedR as number) : null;
    if (next) tapVibration();
    onChange(
      { completed: next, actualWeight: validW, actualReps: validR },
      true
    );
  }

  const hint =
    !set.completed && lastWeight !== null
      ? `last: ${formatWeightShort(lastWeight, units)} × ${lastReps ?? "—"}`
      : null;

  return (
    <SwipeRow
      onAction={onDelete}
      actionLabel="Delete"
      actionTone="destructive"
      actionIcon={<Trash2 className="w-3.5 h-3.5" />}
      className="rounded-md"
    >
      <div
        className={cn(
          "grid grid-cols-[1fr_1fr_56px] items-center gap-2 rounded-md px-2 py-1.5",
          set.completed ? "bg-accent/10" : "bg-background"
        )}
      >
        <label className="flex flex-col min-w-0">
          <input
            type="text"
            inputMode="decimal"
            enterKeyHint="next"
            value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            onBlur={commitOnBlur}
            placeholder={unitLabel(units)}
            aria-label={`Weight (${unitLabel(units)})`}
            className={cn(
              "w-full min-w-0 h-14 rounded bg-transparent px-2 text-center tabular-nums outline-none border border-transparent focus:border-border-strong focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
              set.completed
                ? "text-base text-foreground-muted"
                : "text-2xl font-semibold"
            )}
          />
          {hint ? (
            <span className="text-[10px] text-foreground-muted px-1 -mt-0.5">{hint}</span>
          ) : null}
        </label>
        <input
          type="text"
          inputMode="numeric"
          enterKeyHint="done"
          value={repsStr}
          onChange={(e) => setRepsStr(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commitOnBlur}
          placeholder="reps"
          aria-label="Reps"
          className={cn(
            "w-full min-w-0 h-14 rounded bg-transparent px-2 text-center tabular-nums outline-none border border-transparent focus:border-border-strong focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
            set.completed
              ? "text-base text-foreground-muted"
              : "text-2xl font-semibold"
          )}
        />
        <button
          type="button"
          aria-label={set.completed ? "Mark set incomplete" : "Mark set complete"}
          onClick={toggleComplete}
          className={cn(
            "h-14 w-14 rounded-xl flex items-center justify-center border transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
            set.completed
              ? "bg-emerald-500 border-emerald-500 text-black"
              : "border-border-strong text-foreground-muted"
          )}
        >
          <span
            key={String(set.completed)}
            className={cn(
              "flex items-center justify-center",
              set.completed && "animate-set-check"
            )}
          >
            <Check className="w-5 h-5" strokeWidth={3} />
          </span>
        </button>
      </div>
    </SwipeRow>
  );
}
