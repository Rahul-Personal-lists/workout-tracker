"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Play, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, parseDuration } from "@/lib/format";
import { SwipeRow } from "@/components/swipe-row";
import { useTimeSetTimer } from "@/lib/stores/time-set-timer";
import {
  type StepLead,
  tapVibration,
  unlockStepCueAudio,
  useStepCues,
} from "@/lib/step-cue";
import type { SetRow } from "./types";

export function TimeSetInputRow({
  set,
  setKey,
  plannedSeconds,
  lastSeconds,
  soundLead,
  vibrationLead,
  onChange,
  onDelete,
}: {
  set: SetRow;
  setKey: string;
  plannedSeconds: number | null;
  lastSeconds: number | null;
  soundLead: StepLead;
  vibrationLead: StepLead;
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

  // Read onChange via a ref so the expiry effect doesn't re-subscribe when the
  // parent passes a fresh inline onChange each render (P3).
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // The active countdown lives in a persisted store (one timed set at a time),
  // so it survives navigation/unmount. This row owns it while the store's
  // setKey matches; otherwise it shows the editable input.
  const activeSetKey = useTimeSetTimer((s) => s.setKey);
  const storeEndsAt = useTimeSetTimer((s) => s.endsAt);
  const storeTargetSec = useTimeSetTimer((s) => s.targetSec);
  const startTimer = useTimeSetTimer((s) => s.start);
  const stopTimer = useTimeSetTimer((s) => s.stop);

  // Gate on hydration so SSR and the first client render match (the store
  // rehydrates from localStorage on the client).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useTimeSetTimer.persist.hasHydrated());
    return useTimeSetTimer.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const running = hydrated && activeSetKey === setKey && storeEndsAt !== null;
  const endsAt = running ? storeEndsAt : null;
  const targetSec = running ? storeTargetSec : null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  useStepCues({ endsAt, soundLead, vibrationLead, now });

  useEffect(() => {
    if (endsAt === null || targetSec === null) return;
    if (now < endsAt) return;
    // Expiry — including a countdown that ended while this row was unmounted and
    // is restored already past its end: complete the set once, clear the timer.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDurationStr(formatDuration(targetSec));
    stopTimer();
    onChangeRef.current({ completed: true, actualSeconds: targetSec }, true);
  }, [endsAt, targetSec, now, stopTimer]);

  function commitOnBlur() {
    if (running) return;
    const parsed = parseDuration(durationStrRef.current);
    if (parsed !== set.actualSeconds) {
      onChange({ actualSeconds: parsed }, set.completed);
    }
  }

  const startTarget = parseDuration(durationStr) ?? plannedSeconds;
  const canStart = !set.completed && startTarget !== null && startTarget > 0;

  function startCountdown() {
    if (!canStart || startTarget === null) return;
    unlockStepCueAudio();
    setNow(Date.now());
    startTimer(setKey, startTarget);
  }

  function stopCountdown() {
    if (endsAt === null || targetSec === null) return;
    const remainingSec = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    const elapsed = Math.max(1, targetSec - remainingSec);
    stopTimer();
    setDurationStr(formatDuration(elapsed));
    tapVibration();
    onChange({ completed: true, actualSeconds: elapsed }, true);
  }

  function toggleComplete() {
    const next = !set.completed;
    const parsed = parseDuration(durationStrRef.current);
    if (next) tapVibration();
    onChange({ completed: next, actualSeconds: parsed }, true);
  }

  const remaining =
    endsAt !== null ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;

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
          set.completed && !running ? "bg-accent/10" : "bg-background"
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
                "w-full min-w-0 h-14 rounded bg-transparent px-2 text-center tabular-nums outline-none border border-transparent focus:border-border-strong focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
                set.completed
                  ? "text-base text-foreground-muted"
                  : "text-2xl font-semibold"
              )}
            />
          )}
          {hint ? (
            <span className="text-[10px] text-foreground-muted px-1 -mt-0.5">{hint}</span>
          ) : null}
        </label>
        {running ? (
          <button
            type="button"
            aria-label="Stop timer"
            onClick={stopCountdown}
            className="h-14 w-14 rounded-xl flex items-center justify-center bg-emerald-500 border border-emerald-500 text-black outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
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
              className="h-14 w-14 rounded-xl flex items-center justify-center border border-border-strong text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
            >
              <Play className="w-4 h-4" fill="currentColor" strokeWidth={0} />
            </button>
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
          </>
        )}
      </div>
    </SwipeRow>
  );
}
