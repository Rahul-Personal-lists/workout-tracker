"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, parseDuration } from "@/lib/format";
import { SwipeRow } from "@/components/swipe-row";
import type { SetRow } from "./types";

export function TimeSetInputRow({
  set,
  plannedSeconds,
  lastSeconds,
  onChange,
  onDelete,
}: {
  set: SetRow;
  plannedSeconds: number | null;
  lastSeconds: number | null;
  onChange: (patch: Partial<SetRow>, persist: boolean) => void;
  onDelete: () => void;
}) {
  const [durationStr, setDurationStr] = useState(
    set.actualSeconds !== null ? formatDuration(set.actualSeconds) : ""
  );
  const durationStrRef = useRef(durationStr);
  useEffect(() => {
    durationStrRef.current = durationStr;
  }, [durationStr]);

  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [targetSec, setTargetSec] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt === null || targetSec === null) return;
    if (now < endsAt) return;
    setEndsAt(null);
    setTargetSec(null);
    setDurationStr(formatDuration(targetSec));
    onChange({ completed: true, actualSeconds: targetSec }, true);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([200, 80, 200]);
    }
  }, [endsAt, targetSec, now, onChange]);

  function commitOnBlur() {
    if (endsAt !== null) return;
    const parsed = parseDuration(durationStrRef.current);
    if (parsed !== set.actualSeconds) {
      onChange({ actualSeconds: parsed }, set.completed);
    }
  }

  const startTarget = parseDuration(durationStr) ?? plannedSeconds;
  const canStart = !set.completed && startTarget !== null && startTarget > 0;

  function startCountdown() {
    if (!canStart || startTarget === null) return;
    setTargetSec(startTarget);
    setNow(Date.now());
    setEndsAt(Date.now() + startTarget * 1000);
  }

  function stopCountdown() {
    if (endsAt === null || targetSec === null) return;
    const remainingSec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const elapsed = Math.max(1, targetSec - remainingSec);
    setEndsAt(null);
    setTargetSec(null);
    setDurationStr(formatDuration(elapsed));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(15);
    }
    onChange({ completed: true, actualSeconds: elapsed }, true);
  }

  function toggleComplete() {
    const next = !set.completed;
    const parsed = parseDuration(durationStrRef.current);
    if (next && typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(15);
    }
    onChange({ completed: next, actualSeconds: parsed }, true);
  }

  const remaining =
    endsAt !== null ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;
  const running = endsAt !== null;

  const placeholder =
    plannedSeconds !== null ? formatDuration(plannedSeconds) : "mm:ss";
  const hint =
    !set.completed && !running && lastSeconds !== null
      ? `last: ${formatDuration(lastSeconds)}`
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
          "grid items-center gap-2 rounded-md px-2 py-1.5",
          running
            ? "grid-cols-[1fr_56px]"
            : "grid-cols-[1fr_56px_56px]",
          set.completed && !running ? "bg-neutral-800/60" : "bg-background"
        )}
      >
        <label className="flex flex-col min-w-0">
          {running && remaining !== null ? (
            <div
              role="timer"
              aria-live="polite"
              aria-label={`Time remaining ${formatDuration(remaining)}`}
              className="w-full min-w-0 h-14 flex items-center justify-center text-3xl font-semibold tabular-nums text-accent"
            >
              {formatDuration(remaining)}
            </div>
          ) : (
            <input
              type="text"
              inputMode="numeric"
              enterKeyHint="done"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
              onBlur={commitOnBlur}
              placeholder={placeholder}
              className={cn(
                "w-full min-w-0 h-14 rounded bg-transparent px-2 text-center tabular-nums outline-none border border-transparent focus:border-border-strong",
                set.completed
                  ? "text-base text-foreground-muted"
                  : "text-2xl font-semibold"
              )}
            />
          )}
          {hint ? (
            <span className="text-[10px] text-neutral-500 px-1 -mt-0.5">{hint}</span>
          ) : null}
        </label>
        {running ? (
          <button
            type="button"
            aria-label="Stop timer"
            onClick={stopCountdown}
            className="h-14 w-14 rounded-xl flex items-center justify-center bg-emerald-500 border border-emerald-500 text-black"
          >
            <Square className="w-4 h-4" fill="currentColor" strokeWidth={0} />
          </button>
        ) : (
          <>
            <button
              type="button"
              aria-label="Start timer"
              onClick={startCountdown}
              disabled={!canStart}
              className="h-14 w-14 rounded-xl flex items-center justify-center border border-border-strong text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            </button>
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
          </>
        )}
      </div>
    </SwipeRow>
  );
}
