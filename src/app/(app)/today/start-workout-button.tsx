"use client";

import { useTransition } from "react";
import { startWorkout } from "@/app/actions/workout";

export function StartWorkoutButton({
  programDayId,
  weekNumber,
}: {
  programDayId: string;
  weekNumber: number;
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="btn-primary w-full h-14 text-base"
    >
      {pending ? "Starting…" : "Start workout"}
    </button>
  );
}
