"use client";

import { useTransition } from "react";
import { startWorkout } from "@/app/actions/workout";

export function StartWorkoutButton({
  programDayId,
  weekNumber,
  variant = "start",
}: {
  programDayId: string;
  weekNumber: number;
  // "redo" keeps the same server call — startWorkout creates a fresh session
  // for (day, week) regardless of prior completions. Only the label and the
  // visual weight differ (secondary vs primary).
  variant?: "start" | "redo";
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await startWorkout({ programDayId, weekNumber });
      } catch (err) {
        console.error("start workout failed", err);
      }
    });
  }

  const label =
    pending ? "Starting…" : variant === "redo" ? "Redo workout" : "Start workout";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      data-tour="today-cta"
      className={
        variant === "redo"
          ? "btn-secondary w-full h-14 text-base"
          : "btn-primary w-full h-14 text-base"
      }
    >
      {label}
    </button>
  );
}
