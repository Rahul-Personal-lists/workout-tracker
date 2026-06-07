"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { editSetLog } from "@/app/actions/workout";
import {
  formatDuration,
  formatWeight,
  formatWeightShort,
  parseDuration,
  parseWeightInput,
  unitLabel,
} from "@/lib/format";
import type { Units } from "@/lib/units";

type Props = {
  sessionId: string;
  programExerciseId: string;
  setNumber: number;
  plannedWeight: number | null;
  plannedReps: number | null;
  actualWeight: number | null;
  actualReps: number | null;
  plannedSeconds: number | null;
  actualSeconds: number | null;
  completed: boolean;
  units: Units;
};

export function EditableSetRow({
  sessionId,
  programExerciseId,
  setNumber,
  plannedWeight,
  plannedReps,
  actualWeight,
  actualReps,
  plannedSeconds,
  actualSeconds,
  completed,
  units,
}: Props) {
  const isTime = plannedSeconds !== null || actualSeconds !== null;
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const initWeight = actualWeight !== null ? formatWeightShort(actualWeight, units) : "";
  const initReps = actualReps !== null ? String(actualReps) : "";
  const initDuration = actualSeconds !== null ? formatDuration(actualSeconds) : "";

  const [weight, setWeight] = useState(initWeight);
  const [reps, setReps] = useState(initReps);
  const [duration, setDuration] = useState(initDuration);
  const [done, setDone] = useState(completed);

  function save() {
    if (isTime) {
      const trimmed = duration.trim();
      const sec = trimmed === "" ? null : parseDuration(trimmed);
      if (trimmed !== "" && sec === null) return;
      startTransition(async () => {
        try {
          await editSetLog({
            sessionId,
            programExerciseId,
            setNumber,
            plannedWeight: null,
            plannedReps: null,
            actualWeight: null,
            actualReps: null,
            plannedSeconds,
            actualSeconds: sec,
            completed: done,
          });
          setError(null);
          setEditing(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save.");
        }
      });
      return;
    }

    const w =
      weight.trim() === "" ? null : parseWeightInput(weight, units);
    const r = reps.trim() === "" ? null : Number(reps);
    if (weight.trim() !== "" && w === null) return;
    if (r !== null && (!Number.isInteger(r) || r < 0)) return;
    startTransition(async () => {
      try {
        await editSetLog({
          sessionId,
          programExerciseId,
          setNumber,
          plannedWeight,
          plannedReps,
          actualWeight: w,
          actualReps: r,
          plannedSeconds: null,
          actualSeconds: null,
          completed: done,
        });
        setError(null);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function cancel() {
    setWeight(initWeight);
    setReps(initReps);
    setDuration(initDuration);
    setDone(completed);
    setError(null);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-1">
      <div className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-sm">
        <span className="text-foreground-muted tabular-nums">{setNumber}</span>
        <div className="flex items-center gap-1.5">
          {isTime ? (
            <input
              aria-label="Duration (mm:ss)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              inputMode="numeric"
              placeholder="mm:ss"
              className="h-8 w-20 rounded bg-background border border-border-strong px-2 text-xs tabular-nums"
            />
          ) : (
            <>
              <input
                aria-label={`Weight (${unitLabel(units)})`}
                value={weight}
                onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, "").slice(0, 6))}
                inputMode="decimal"
                placeholder={unitLabel(units)}
                className="h-8 w-16 rounded bg-background border border-border-strong px-2 text-xs tabular-nums"
              />
              <span className="text-foreground-muted text-xs">×</span>
              <input
                aria-label="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="reps"
                className="h-8 w-14 rounded bg-background border border-border-strong px-2 text-xs tabular-nums"
              />
            </>
          )}
          <label className="ml-1 inline-flex items-center gap-1 text-[11px] text-foreground-muted">
            <input
              type="checkbox"
              checked={done}
              onChange={(e) => setDone(e.target.checked)}
              className="accent-accent"
            />
            done
          </label>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            aria-label="Save"
            className="h-8 w-8 flex items-center justify-center text-emerald-400 disabled:opacity-50 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="h-8 w-8 flex items-center justify-center text-foreground-muted outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {error ? <p role="alert" className="text-[11px] text-red-400">{error}</p> : null}
      </div>
    );
  }

  if (isTime) {
    const hasActual = actualSeconds !== null;
    const matchesPlan =
      hasActual && plannedSeconds !== null && actualSeconds === plannedSeconds;
    const exceeds =
      hasActual && plannedSeconds !== null && actualSeconds! > plannedSeconds;
    const showPlanned = plannedSeconds !== null && !matchesPlan;
    const dimmed = !completed && !hasActual;

    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "w-full grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm text-left rounded -mx-1 px-1 py-0.5 hover:bg-surface-hover outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
          dimmed && "text-foreground-muted"
        )}
      >
        <span className="text-foreground-muted tabular-nums">{setNumber}</span>
        <span className={cn("tabular-nums", !dimmed && "font-medium")}>
          {hasActual ? formatDuration(actualSeconds!) : "—"}
        </span>
        <span className="text-[11px] text-foreground-muted tabular-nums">
          {showPlanned ? (
            <>
              {hasActual ? (
                <span className={exceeds ? "text-accent" : "text-foreground-muted"}>
                  {exceeds ? "↑" : "↓"}{" "}
                </span>
              ) : null}
              planned {formatDuration(plannedSeconds!)}
            </>
          ) : null}
        </span>
      </button>
    );
  }

  const hasActual = actualWeight !== null && actualReps !== null;
  const matchesPlan =
    hasActual &&
    plannedWeight !== null &&
    actualWeight === plannedWeight &&
    actualReps === plannedReps;
  const exceeds =
    hasActual &&
    plannedWeight !== null &&
    plannedReps !== null &&
    actualWeight! * actualReps! > plannedWeight * plannedReps;
  const showPlanned = plannedWeight !== null && !matchesPlan;
  const dimmed = !completed && !hasActual;

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "w-full grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm text-left rounded -mx-1 px-1 py-0.5 hover:bg-surface-hover",
        dimmed && "text-foreground-muted"
      )}
    >
      <span className="text-foreground-muted tabular-nums">{setNumber}</span>
      <span className={cn("tabular-nums", !dimmed && "font-medium")}>
        {actualWeight !== null ? formatWeight(actualWeight, units) : "—"}
        {actualReps !== null ? ` × ${actualReps}` : ""}
      </span>
      <span className="text-[11px] text-foreground-muted tabular-nums">
        {showPlanned ? (
          <>
            {hasActual ? (
              <span className={exceeds ? "text-accent" : "text-foreground-muted"}>
                {exceeds ? "↑" : "↓"}{" "}
              </span>
            ) : null}
            planned {formatWeight(plannedWeight, units)} × {plannedReps ?? "—"}
          </>
        ) : null}
      </span>
    </button>
  );
}
