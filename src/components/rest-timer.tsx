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

export function RestTimerBar() {
  const endsAt = useRestTimer((s) => s.endsAt);
  const defaultDuration = useRestTimer((s) => s.defaultDuration);
  const setDefaultDuration = useRestTimer((s) => s.setDefaultDuration);
  const adjust = useRestTimer((s) => s.adjust);
  const stop = useRestTimer((s) => s.stop);
  const start = useRestTimer((s) => s.start);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt === null) return;
    if (Date.now() >= endsAt) {
      stop();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([200, 80, 200]);
      }
    }
  }, [endsAt, now, stop]);

  if (endsAt === null) {
    return (
      <details className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs">
        <summary className="cursor-pointer text-neutral-400 select-none">
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
                  ? "border-emerald-500 text-emerald-400"
                  : "border-neutral-800 text-neutral-400"
              )}
            >
              {d}s
            </button>
          ))}
          <button
            type="button"
            onClick={() => start()}
            className="ml-auto h-8 px-3 rounded text-xs bg-neutral-800 text-neutral-200"
          >
            Start
          </button>
        </div>
      </details>
    );
  }

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000));

  return (
    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 flex items-center gap-3">
      <span className="text-xs uppercase tracking-wide text-emerald-400">Rest</span>
      <span className="text-lg font-semibold tabular-nums text-emerald-300 flex-1 text-center">
        {formatDuration(remaining)}
      </span>
      <button
        type="button"
        aria-label="-15s"
        onClick={() => adjust(-15)}
        className="h-8 w-8 rounded border border-emerald-500/40 text-emerald-300 flex items-center justify-center"
      >
        <Minus className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="+15s"
        onClick={() => adjust(15)}
        className="h-8 w-8 rounded border border-emerald-500/40 text-emerald-300 flex items-center justify-center"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        type="button"
        aria-label="Stop"
        onClick={stop}
        className="h-8 w-8 rounded text-emerald-300 flex items-center justify-center"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
