"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWeight } from "@/lib/format";
import { SwipeRow } from "@/components/swipe-row";
import type { SetRow } from "./types";

export function SetInputRow({
  set,
  lastWeight,
  lastReps,
  onChange,
  onDelete,
}: {
  set: SetRow;
  lastWeight: number | null;
  lastReps: number | null;
  onChange: (patch: Partial<SetRow>, persist: boolean) => void;
  onDelete: () => void;
}) {
  const [weightStr, setWeightStr] = useState(
    set.actualWeight !== null ? formatWeight(set.actualWeight) : ""
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

  function commitOnBlur() {
    const w = weightStrRef.current.trim();
    const r = repsStrRef.current.trim();
    const parsedW = w === "" ? null : Number(w);
    const parsedR = r === "" ? null : parseInt(r, 10);
    const validW = parsedW === null || Number.isFinite(parsedW) ? parsedW : null;
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
    const parsedW = weightStrRef.current.trim() === "" ? null : Number(weightStrRef.current);
    const parsedR = repsStrRef.current.trim() === "" ? null : parseInt(repsStrRef.current, 10);
    const validW = Number.isFinite(parsedW as number) ? (parsedW as number) : null;
    const validR = Number.isFinite(parsedR as number) ? (parsedR as number) : null;
    if (next && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(15);
    }
    onChange(
      { completed: next, actualWeight: validW, actualReps: validR },
      true
    );
  }

  const hint =
    !set.completed && lastWeight !== null
      ? `last: ${formatWeight(lastWeight)} × ${lastReps ?? "—"}`
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
          set.completed ? "bg-neutral-800/60" : "bg-background"
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
            placeholder="lb"
            className={cn(
              "w-full min-w-0 h-14 rounded bg-transparent px-2 text-center tabular-nums outline-none border border-transparent focus:border-border-strong",
              set.completed
                ? "text-base text-foreground-muted"
                : "text-2xl font-semibold"
            )}
          />
          {hint ? (
            <span className="text-[10px] text-neutral-500 px-1 -mt-0.5">{hint}</span>
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
          className={cn(
            "w-full min-w-0 h-14 rounded bg-transparent px-2 text-center tabular-nums outline-none border border-transparent focus:border-border-strong",
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
            "h-14 w-14 rounded-xl flex items-center justify-center border transition-colors",
            set.completed
              ? "bg-emerald-500 border-emerald-500 text-black"
              : "border-border-strong text-neutral-500"
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
