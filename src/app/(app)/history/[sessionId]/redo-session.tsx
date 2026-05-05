"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { startWorkout } from "@/app/actions/workout";
import { cn } from "@/lib/utils";

export function RedoSessionButton({
  programDayId,
  weekNumber,
}: {
  programDayId: string;
  weekNumber: number;
}) {
  const [pending, start] = useTransition();

  function onClick() {
    // startWorkout redirects via NEXT_REDIRECT — let it propagate out of
    // the transition so the navigation actually happens. Same pattern as
    // pause/resume in workout-client.tsx.
    start(async () => {
      await startWorkout({ programDayId, weekNumber });
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "w-full h-12 rounded-md border border-neutral-800 bg-neutral-900 text-sm font-medium inline-flex items-center justify-center gap-2 outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]",
        pending && "opacity-50"
      )}
    >
      <RotateCcw className="w-4 h-4" />
      {pending ? "Starting…" : "Redo this workout"}
    </button>
  );
}
