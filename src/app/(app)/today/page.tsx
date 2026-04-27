import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProgram, getNextWorkout } from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatWeight } from "@/lib/format";
import { startWorkout } from "@/app/actions/workout";
import { seedStarterProgram } from "@/app/actions/program";

export default async function TodayPage() {
  const program = await getCurrentProgram();

  if (!program) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Today</h1>
        </header>
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 space-y-3">
          <p>You don&apos;t have a program yet.</p>
          <form
            action={async () => {
              "use server";
              await seedStarterProgram();
            }}
          >
            <button
              type="submit"
              className="w-full h-11 rounded-md bg-white text-black font-medium text-sm"
            >
              Use 12-Week starter program
            </button>
          </form>
        </div>
      </div>
    );
  }

  const next = await getNextWorkout(program);
  if (!next) return null;

  if (next.kind === "in-progress") {
    redirect(`/workout/${next.sessionId}`);
  }

  if (next.kind === "complete") {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Today</h1>
        </header>
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm">
          🎉 You finished all {program.weeks} weeks. Time to plan the next block.
        </div>
        <Link
          href="/history"
          className="block w-full text-center h-12 leading-[3rem] rounded-md border border-neutral-800"
        >
          View history
        </Link>
      </div>
    );
  }

  const { weekNumber, day } = next;
  const phase = getPhase(weekNumber);
  const isDeload = program.deload_weeks.includes(weekNumber);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {phase} · Week {weekNumber}
          {isDeload ? " · Deload" : ""}
        </p>
        <h1 className="text-2xl font-semibold">{day.label}: {day.title}</h1>
      </header>

      <ul className="space-y-2">
        {day.exercises.map((ex) => {
          const plannedWeight = getPlannedWeight(
            ex.start_weight,
            ex.increment,
            weekNumber,
            program.deload_weeks
          );
          const plannedReps = getPlannedReps(
            ex.base_reps,
            weekNumber,
            program.deload_weeks
          );
          return (
            <li
              key={ex.id}
              className="rounded-md border border-neutral-800 bg-neutral-900 p-3 flex items-baseline justify-between gap-3"
            >
              <span className="text-sm">{ex.name}</span>
              <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                {ex.sets}×{plannedReps ?? "—"}
                {plannedWeight !== null
                  ? ` · ${formatWeight(plannedWeight)} lb`
                  : ""}
              </span>
            </li>
          );
        })}
      </ul>

      <form
        action={async () => {
          "use server";
          await startWorkout({ programDayId: day.id, weekNumber });
        }}
      >
        <button
          type="submit"
          className="w-full h-14 rounded-md bg-white text-black font-medium text-base"
        >
          Start workout
        </button>
      </form>
    </div>
  );
}
