import { Pause } from "lucide-react";
import { getPausedSession } from "@/lib/queries";
import { resumeSession } from "@/app/actions/workout";

export async function PausedWorkoutBanner() {
  const paused = await getPausedSession();
  if (!paused) return null;

  return (
    <form action={resumeSession.bind(null, { sessionId: paused.id })}>
      <button
        type="submit"
        className="sticky top-0 z-30 w-full flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-center gap-2">
          <Pause className="w-4 h-4 text-accent" strokeWidth={2.25} />
          <span className="font-medium">Workout paused</span>
        </span>
        <span className="text-xs uppercase tracking-wide text-accent">
          Resume
        </span>
      </button>
    </form>
  );
}
