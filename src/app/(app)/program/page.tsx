import Link from "next/link";
import { Play, Plus } from "lucide-react";
import { getCurrentProgram, getNextWorkout } from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { ArchiveExerciseButton } from "./archive-button";
import { startWorkout } from "@/app/actions/workout";
import { seedStarterProgram } from "@/app/actions/program";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const program = await getCurrentProgram();

  if (!program) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Program</h1>
        </header>
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 space-y-3">
          <p>No program yet. Start with the 12-week template — you can edit exercises after.</p>
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
  const currentWeek =
    next && (next.kind === "next" || next.kind === "in-progress")
      ? next.weekNumber
      : 1;

  const parsed = weekParam ? parseInt(weekParam, 10) : NaN;
  const selectedWeek =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= program.weeks
      ? parsed
      : currentWeek;

  const phase = getPhase(selectedWeek);
  const isDeload = program.deload_weeks.includes(selectedWeek);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{program.name}</h1>
        <p className="text-xs text-neutral-500">
          {program.weeks} weeks · deloads on{" "}
          {program.deload_weeks.join(", ") || "none"}
        </p>
      </header>

      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {Array.from({ length: program.weeks }, (_, i) => i + 1).map((w) => {
            const isSelected = w === selectedWeek;
            const isCurrent = w === currentWeek;
            const isDeloadWeek = program.deload_weeks.includes(w);
            return (
              <Link
                key={w}
                href={`/program?week=${w}`}
                scroll={false}
                className={cn(
                  "h-9 min-w-[44px] px-2 rounded-md flex flex-col items-center justify-center text-[11px] tabular-nums border",
                  isSelected
                    ? "bg-white text-black border-white"
                    : isCurrent
                      ? "border-emerald-500 text-emerald-400"
                      : "border-neutral-800 text-neutral-400"
                )}
              >
                <span className="font-medium leading-none">W{w}</span>
                {isDeloadWeek ? (
                  <span className="text-[9px] leading-none mt-0.5 opacity-70">
                    deload
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {phase} · Week {selectedWeek}
        {isDeload ? " · Deload" : ""}
        {selectedWeek === currentWeek ? " · Current" : ""}
      </div>

      <ul className="space-y-3">
        {program.days.map((day) => (
          <li
            key={day.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden"
          >
            <header className="px-3 py-2.5 border-b border-neutral-800 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {day.label}
                </p>
                <h2 className="text-sm font-medium">{day.title}</h2>
              </div>
              <form
                action={async () => {
                  "use server";
                  await startWorkout({
                    programDayId: day.id,
                    weekNumber: selectedWeek,
                  });
                }}
              >
                <button
                  type="submit"
                  className="h-9 px-3 rounded-md bg-white text-black text-xs font-medium flex items-center gap-1.5"
                  aria-label={`Start ${day.label} for week ${selectedWeek}`}
                >
                  <Play className="w-3.5 h-3.5" /> Start W{selectedWeek}
                </button>
              </form>
            </header>
            <ul className="px-3 py-2 space-y-1.5">
              {day.exercises.map((ex) => {
                const w = getPlannedWeight(
                  ex.start_weight,
                  ex.increment,
                  selectedWeek,
                  program.deload_weeks
                );
                const r = getPlannedReps(
                  ex.base_reps,
                  selectedWeek,
                  program.deload_weeks
                );
                return (
                  <li
                    key={ex.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <ExerciseAnimation url={ex.image_url} alt={ex.name} size={44} />
                    <span className="leading-snug flex-1 min-w-0">
                      {ex.name}
                      {ex.note ? (
                        <span className="text-[11px] text-neutral-500 ml-1">
                          ({ex.note})
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                      {ex.sets}×{r ?? "—"}
                      {w !== null ? ` · ${formatWeight(w)} lb` : ""}
                    </span>
                    <ArchiveExerciseButton exerciseId={ex.id} />
                  </li>
                );
              })}
            </ul>
            <Link
              href={`/program/add?day=${day.id}&week=${selectedWeek}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-neutral-400 border-t border-neutral-800 hover:bg-neutral-800/40"
            >
              <Plus className="w-3.5 h-3.5" /> Add exercise
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
