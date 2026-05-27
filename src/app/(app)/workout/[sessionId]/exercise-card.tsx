"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  Plus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatWeight } from "@/lib/format";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { SwipeRow } from "@/components/swipe-row";
import { ExerciseControls } from "@/app/(app)/program/exercise-controls";
import type { ExerciseRow, SetRow } from "./types";
import { SetInputRow } from "./set-input-row";
import { TimeSetInputRow } from "./time-set-input-row";

export function ExerciseCard({
  exercise,
  isFirst,
  isLast,
  onChange,
  onAddSet,
  onDeleteSet,
  onHide,
  onReorder,
}: {
  exercise: ExerciseRow;
  isFirst: boolean;
  isLast: boolean;
  onChange: (
    setNumber: number,
    patch: Partial<SetRow>,
    persist: boolean
  ) => void;
  onAddSet: () => void;
  onDeleteSet: (setNumber: number) => void;
  onHide: () => void;
  onReorder: (direction: "up" | "down") => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const allComplete =
    exercise.sets.length > 0 && exercise.sets.every((s) => s.completed);
  const [expanded, setExpanded] = useState(!allComplete);
  const prevAllComplete = useRef(allComplete);
  useEffect(() => {
    if (prevAllComplete.current !== allComplete) {
      setExpanded(!allComplete);
      prevAllComplete.current = allComplete;
    }
  }, [allComplete]);

  const isTime = exercise.kind === "time";
  const plannedSummary = isTime
    ? `${exercise.sets.length} × ${exercise.plannedSeconds !== null ? formatDuration(exercise.plannedSeconds) : "—"}`
    : exercise.plannedWeight !== null
      ? `${exercise.sets.length}×${exercise.plannedReps ?? "—"} · ${formatWeight(exercise.plannedWeight)} lb`
      : `${exercise.sets.length}×${exercise.plannedReps ?? "—"}`;

  if (allComplete && !expanded) {
    return (
      <li>
        <SwipeRow
          onAction={onHide}
          actionLabel="Hide"
          actionTone="neutral"
          actionIcon={<EyeOff className="w-3.5 h-3.5" />}
          className="rounded-2xl"
        >
          <div className="rounded-2xl border border-border bg-surface-subtle">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded={false}
              aria-label={`Expand ${exercise.name}`}
              className="w-full flex items-center gap-3 p-2.5 text-left"
            >
              <ExerciseAnimation
                url={exercise.imageUrl}
                alt={exercise.name}
                size={40}
              />
              <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium truncate">{exercise.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
                  {plannedSummary}
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
                </span>
              </div>
              <span className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            </button>
          </div>
        </SwipeRow>
      </li>
    );
  }

  return (
    <>
    <li>
      <SwipeRow
        onAction={onHide}
        actionLabel="Hide"
        actionTone="neutral"
        actionIcon={<EyeOff className="w-3.5 h-3.5" />}
        className="rounded-2xl"
      >
        <div className="rounded-2xl border border-border bg-surface p-3 space-y-2">
          <div className="flex items-start gap-3">
            {exercise.imageUrl ? (
              <button
                type="button"
                onClick={() => setZoomed(true)}
                aria-label={`View ${exercise.name} animation`}
                className="shrink-0 rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={64} />
              </button>
            ) : (
              <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={64} />
            )}
            <button
              type="button"
              onClick={allComplete ? () => setExpanded(false) : undefined}
              aria-expanded={allComplete ? true : undefined}
              aria-label={allComplete ? `Collapse ${exercise.name}` : undefined}
              disabled={!allComplete}
              className="flex-1 min-w-0 space-y-0.5 text-left disabled:cursor-default"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium leading-snug">{exercise.name}</h2>
                <span className="flex items-center gap-1 text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
                  {plannedSummary}
                  {allComplete ? (
                    <ChevronUp className="w-3.5 h-3.5 text-neutral-500" />
                  ) : null}
                </span>
              </div>
              {exercise.note ? (
                <p className="text-[11px] text-neutral-500">{exercise.note}</p>
              ) : null}
            </button>
            <ExerciseControls
              exerciseId={exercise.id}
              isFirst={isFirst}
              isLast={isLast}
              showRemove={false}
              onReorder={onReorder}
            />
          </div>

          <div className="space-y-1.5">
            <div
              className={cn(
                "grid gap-2 px-2 text-[10px] uppercase tracking-wide text-neutral-500",
                isTime
                  ? "grid-cols-[1fr_56px]"
                  : "grid-cols-[1fr_1fr_56px]"
              )}
            >
              {isTime ? (
                <span className="text-center">Time</span>
              ) : (
                <>
                  <span className="text-center">Lb</span>
                  <span className="text-center">Reps</span>
                </>
              )}
              <span />
            </div>
            {exercise.sets.map((set) =>
              isTime ? (
                <TimeSetInputRow
                  key={set.setNumber}
                  set={set}
                  plannedSeconds={exercise.plannedSeconds}
                  lastSeconds={exercise.lastSeconds}
                  onChange={(patch, persist) => onChange(set.setNumber, patch, persist)}
                  onDelete={() => onDeleteSet(set.setNumber)}
                />
              ) : (
                <SetInputRow
                  key={set.setNumber}
                  set={set}
                  lastWeight={exercise.lastWeight}
                  lastReps={exercise.lastReps}
                  onChange={(patch, persist) => onChange(set.setNumber, patch, persist)}
                  onDelete={() => onDeleteSet(set.setNumber)}
                />
              )
            )}
            <button
              type="button"
              onClick={onAddSet}
              className="flex items-center justify-center gap-1.5 w-full h-9 rounded-xl border border-dashed border-border-strong text-xs text-foreground-muted hover:text-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add set
            </button>
          </div>
        </div>
      </SwipeRow>
    </li>
    {zoomed && exercise.imageUrl ? (
      <div
        onClick={() => setZoomed(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${exercise.name} animation`}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-surface border border-border rounded-2xl p-4 max-w-sm w-full flex flex-col items-center gap-3"
        >
          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Close"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <ExerciseAnimation url={exercise.imageUrl} alt={exercise.name} size={288} />
          <p className="text-sm text-foreground-muted text-center">{exercise.name}</p>
        </div>
      </div>
    ) : null}
    </>
  );
}
