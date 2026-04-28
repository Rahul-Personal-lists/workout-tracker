"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { editSetLog } from "@/app/actions/workout";
import { formatWeight } from "@/lib/format";

type Props = {
  sessionId: string;
  programExerciseId: string;
  setNumber: number;
  plannedWeight: number | null;
  plannedReps: number | null;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

export function EditableSetRow({
  sessionId,
  programExerciseId,
  setNumber,
  plannedWeight,
  plannedReps,
  actualWeight,
  actualReps,
  completed,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [weight, setWeight] = useState(
    actualWeight !== null ? String(actualWeight) : ""
  );
  const [reps, setReps] = useState(
    actualReps !== null ? String(actualReps) : ""
  );
  const [done, setDone] = useState(completed);

  function save() {
    const w = weight.trim() === "" ? null : Number(weight);
    const r = reps.trim() === "" ? null : Number(reps);
    if (w !== null && (!Number.isFinite(w) || w < 0)) return;
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
          completed: done,
        });
        setEditing(false);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function cancel() {
    setWeight(actualWeight !== null ? String(actualWeight) : "");
    setReps(actualReps !== null ? String(actualReps) : "");
    setDone(completed);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="grid grid-cols-[24px_1fr_auto] items-center gap-2 text-sm">
        <span className="text-neutral-500 tabular-nums">{setNumber}</span>
        <div className="flex items-center gap-1.5">
          <input
            aria-label="Weight (lb)"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, "").slice(0, 6))}
            inputMode="decimal"
            placeholder="lb"
            className="h-8 w-16 rounded bg-neutral-950 border border-neutral-700 px-2 text-xs tabular-nums"
          />
          <span className="text-neutral-500 text-xs">×</span>
          <input
            aria-label="Reps"
            value={reps}
            onChange={(e) => setReps(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="reps"
            className="h-8 w-14 rounded bg-neutral-950 border border-neutral-700 px-2 text-xs tabular-nums"
          />
          <label className="ml-1 inline-flex items-center gap-1 text-[11px] text-neutral-400">
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
            className="h-8 w-8 flex items-center justify-center text-emerald-400 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="h-8 w-8 flex items-center justify-center text-neutral-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
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
        "w-full grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm text-left rounded -mx-1 px-1 py-0.5 hover:bg-neutral-800/40",
        dimmed && "text-neutral-500"
      )}
    >
      <span className="text-neutral-600 tabular-nums">{setNumber}</span>
      <span className={cn("tabular-nums", !dimmed && "font-medium")}>
        {actualWeight !== null ? `${formatWeight(actualWeight)} lb` : "—"}
        {actualReps !== null ? ` × ${actualReps}` : ""}
      </span>
      <span className="text-[11px] text-neutral-500 tabular-nums">
        {showPlanned ? (
          <>
            {hasActual ? (
              <span className={exceeds ? "text-accent" : "text-neutral-500"}>
                {exceeds ? "↑" : "↓"}{" "}
              </span>
            ) : null}
            planned {formatWeight(plannedWeight)} × {plannedReps ?? "—"}
          </>
        ) : null}
      </span>
    </button>
  );
}
