"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Moon, Plus } from "lucide-react";
import { skipRestDay } from "@/app/actions/workout";
import type { SlotState } from "./types";

export function RestDayCard({
  dayId,
  weekNumber,
  slotState,
  editHref,
}: {
  dayId: string;
  weekNumber: number;
  slotState: SlotState;
  editHref: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCompleted = slotState === "completed";
  // Only skip the rest day when it's actually due. Skipping an upcoming day
  // would log the most-recent finished session out of order and make
  // getNextWorkout jump the cycle past the intervening days.
  const canSkip = slotState === "today";

  function onSkip() {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        await skipRestDay({ programDayId: dayId, weekNumber });
        router.refresh();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Couldn't skip.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 text-center space-y-3">
      <Moon
        aria-hidden="true"
        strokeWidth={1.5}
        className="w-10 h-10 text-foreground-muted mx-auto"
      />
      <div className="space-y-1">
        <p className="font-medium">Rest day</p>
        <p className="text-sm text-foreground-muted">
          {isCompleted
            ? "Logged as a rest day."
            : canSkip
              ? "No exercises scheduled. Skip it to log a rest and move on — or add exercises to make it a training day."
              : "No exercises scheduled. You can skip it when it's up next — or add exercises to make it a training day."}
        </p>
      </div>

      {isCompleted ? (
        <p className="inline-flex items-center justify-center gap-1.5 text-sm text-foreground-muted">
          <Check className="w-4 h-4" aria-hidden="true" /> Rest logged
        </p>
      ) : (
        <div className="space-y-2">
          {canSkip ? (
            <button
              type="button"
              onClick={onSkip}
              disabled={pending}
              className="btn-primary w-full h-11 text-sm"
            >
              {pending ? "Skipping…" : "Skip rest day"}
            </button>
          ) : null}
          <Link href={editHref} className="btn-secondary w-full h-11 text-sm">
            <Plus className="w-4 h-4" /> Add exercises
          </Link>
        </div>
      )}

      {errorMsg ? <p className="text-xs text-red-400">{errorMsg}</p> : null}
    </div>
  );
}
