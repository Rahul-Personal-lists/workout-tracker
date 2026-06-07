"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REST_DURATIONS,
  type RestDuration,
  useRestTimer,
} from "@/lib/stores/rest-timer";
import { formatDuration } from "@/lib/format";
import {
  type StepLead,
  unlockStepCueAudio,
  useStepCues,
} from "@/lib/step-cue";

// `floating` splits the component into two complementary mounts:
//   - default (inline): renders the idle settings disclosure when no timer is
//     running. Returns null while a timer is active so the floating mount owns
//     the running countdown.
//   - floating: returns null when idle; renders the active countdown bar when
//     a timer is running. Caller is responsible for positioning the parent
//     (e.g. inside the fixed-bottom Finish footer in workout-client).
export function RestTimerBar({
  floating = false,
  soundLead,
  vibrationLead,
}: {
  floating?: boolean;
  soundLead: StepLead;
  vibrationLead: StepLead;
}) {
  const rawEndsAt = useRestTimer((s) => s.endsAt);
  const rawPausedAt = useRestTimer((s) => s.pausedAt);
  const defaultDuration = useRestTimer((s) => s.defaultDuration);
  const setDefaultDuration = useRestTimer((s) => s.setDefaultDuration);
  const adjust = useRestTimer((s) => s.adjust);
  const stop = useRestTimer((s) => s.stop);
  const start = useRestTimer((s) => s.start);

  // Gate the persisted timer state on hydration so SSR and the first client
  // render agree (the store rehydrates endsAt/pausedAt from localStorage),
  // avoiding an idle->active flash. Mirrors TimeSetInputRow.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useRestTimer.persist.hasHydrated());
    return useRestTimer.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  const endsAt = hydrated ? rawEndsAt : null;
  const pausedAt = hydrated ? rawPausedAt : null;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null || pausedAt !== null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt, pausedAt]);

  useStepCues({
    // Only the floating mount runs cues — inline + floating are both mounted while
    // a timer is active, but inline returns null and would double-fire otherwise.
    endsAt: floating ? endsAt : null,
    soundLead,
    vibrationLead,
    now,
    paused: pausedAt !== null,
  });

  useEffect(() => {
    if (!floating || endsAt === null || pausedAt !== null) return;
    if (Date.now() >= endsAt) {
      stop();
    }
  }, [floating, endsAt, pausedAt, now, stop]);

  if (endsAt === null) {
    if (floating) return null;
    return (
      <details className="rounded-2xl border border-border bg-surface px-3 py-2 text-xs">
        <summary className="cursor-pointer text-foreground-muted select-none">
          Rest: {defaultDuration}s default
        </summary>
        <div className="flex items-center gap-1.5 mt-2">
          {REST_DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDefaultDuration(d as RestDuration)}
              className={cn(
                "h-8 px-2.5 rounded text-xs tabular-nums border",
                d === defaultDuration
                  ? "border-accent text-accent"
                  : "border-border text-foreground-muted"
              )}
            >
              {d}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              unlockStepCueAudio();
              start();
            }}
            className="ml-auto h-8 px-3 rounded-lg text-xs border border-border text-foreground hover:bg-surface-hover"
          >
            Start
          </button>
        </div>
      </details>
    );
  }

  // Active state — only the floating mount renders it, so the timer follows
  // the user even when they scroll past the original inline position.
  if (!floating) return null;

  // Freeze the displayed remaining at the moment of pause.
  const referenceNow = pausedAt ?? now;
  const remaining = Math.max(0, Math.ceil((endsAt - referenceNow) / 1000));
  const isEnding = pausedAt === null && remaining > 0 && remaining < 5;

  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2 flex items-center gap-3",
        isEnding && "animate-pulse"
      )}
    >
      <span className="text-xs uppercase tracking-wide text-accent">Rest</span>
      <span className="text-lg font-semibold tabular-nums text-accent flex-1 text-center">
        {formatDuration(remaining)}
      </span>
      <button
        type="button"
        aria-label="-15s"
        onClick={() => adjust(-15)}
        className="h-8 w-8 rounded-lg border border-accent/40 text-accent flex items-center justify-center"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="+15s"
        onClick={() => adjust(15)}
        className="h-8 w-8 rounded-lg border border-accent/40 text-accent flex items-center justify-center"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Stop"
        onClick={stop}
        className="h-8 w-8 rounded-lg text-accent flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
