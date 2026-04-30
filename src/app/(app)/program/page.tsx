import Link from "next/link";
import { ChevronRight, Play, Plus } from "lucide-react";
import {
  getAllPrograms,
  getCompletedDayIdsForWeek,
  getCurrentProgram,
  getNextWorkout,
} from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatWeight } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { PRESET_PROGRAMS } from "@/lib/starter-program";
import { ArchiveExerciseButton } from "./archive-button";
import { DayControls } from "./day-controls";
import { ProgramSwitcher } from "./program-switcher";
import { startWorkout } from "@/app/actions/workout";
import { addDay, seedPresetProgram } from "@/app/actions/program";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const [program, allPrograms] = await Promise.all([
    getCurrentProgram(),
    getAllPrograms(),
  ]);

  if (!program) {
    return (
      <div className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">New program</h1>
          <p className="text-xs text-neutral-500">
            Pick a template or build your own.
          </p>
        </header>
        <ul className="space-y-2">
          {PRESET_PROGRAMS.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 space-y-2"
            >
              <div>
                <h2 className="text-sm font-medium">{p.name}</h2>
                <p className="text-[11px] text-neutral-500">
                  {p.weeks} weeks · {p.days.length} days/week
                  {p.deload_weeks.length
                    ? ` · deloads ${p.deload_weeks.join(", ")}`
                    : ""}
                </p>
                <p className="text-xs text-neutral-400 mt-1">{p.description}</p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await seedPresetProgram({ presetId: p.id });
                }}
              >
                <button
                  type="submit"
                  className="btn-primary w-full h-10 text-xs"
                >
                  Use this program
                </button>
              </form>
            </li>
          ))}
        </ul>
        <Link
          href="/program/new"
          className="btn-ghost-add h-12 px-3 text-sm"
        >
          <Plus className="w-4 h-4" /> Create blank program
        </Link>
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
  const canAddProgram = allPrograms.length < 2;

  const completedDayIds = await getCompletedDayIdsForWeek(
    program.id,
    selectedWeek
  );
  const nextUpDay = program.days.find((d) => !completedDayIds.has(d.id));
  const nextUpDayId = nextUpDay?.id ?? null;
  const programIsEmpty = program.days.every((d) => d.exercises.length === 0);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{program.name}</h1>
        <p className="text-xs text-neutral-500">
          {program.weeks} weeks · deloads on{" "}
          {program.deload_weeks.join(", ") || "none"}
        </p>
      </header>

      {(allPrograms.length > 1 || canAddProgram) && (
        <div className="flex items-center justify-between gap-2">
          {allPrograms.length > 1 ? (
            <ProgramSwitcher programs={allPrograms} />
          ) : (
            <span />
          )}
          {canAddProgram ? (
            <Link
              href="/program/new"
              className="btn-secondary h-9 px-3 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> New program
            </Link>
          ) : null}
        </div>
      )}

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
                    ? "bg-accent text-accent-foreground border-accent"
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

      {programIsEmpty ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
          <p className="font-medium text-neutral-100">No exercises yet.</p>
          <p className="text-neutral-400 mt-1">
            Add them per day below — tap the{" "}
            <span aria-hidden>⋯</span>
            <span className="sr-only">menu</span> on a day to add exercises.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {program.days.map((day) => {
          const titleWords = day.title.split(/\s+/);
          const titleLast = titleWords.pop() ?? "";
          const titleRest = titleWords.join(" ");
          const isNextUp = day.id === nextUpDayId;
          return (
          <li
            key={day.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden"
          >
            <header className="px-3 py-2.5 border-b border-neutral-800 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {day.label}
                </p>
                <h2 className="text-sm font-medium truncate">
                  {titleRest ? `${titleRest} ` : ""}
                  <em className="font-display italic font-medium">{titleLast}</em>
                </h2>
              </div>
              <DayControls
                dayId={day.id}
                initialLabel={day.label}
                initialTitle={day.title}
                selectedWeek={selectedWeek}
              />
              <form
                action={async () => {
                  "use server";
                  await startWorkout({
                    programDayId: day.id,
                    weekNumber: selectedWeek,
                  });
                }}
              >
                {isNextUp ? (
                  <button
                    type="submit"
                    className="btn-primary h-9 px-3 text-xs"
                    aria-label={`Start ${day.label} for week ${selectedWeek}`}
                  >
                    <Play className="w-3.5 h-3.5" /> Start W{selectedWeek}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="h-11 w-11 rounded flex items-center justify-center text-neutral-500 hover:text-neutral-300"
                    aria-label={`Start ${day.label} for week ${selectedWeek}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
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
              {day.exercises.length === 0 && !programIsEmpty ? (
                <li className="text-xs text-neutral-500 italic px-1 py-2">
                  No exercises yet.
                </li>
              ) : null}
            </ul>
          </li>
          );
        })}
      </ul>

      <form
        action={async () => {
          "use server";
          const nextN = program.days.length + 1;
          await addDay({
            programId: program.id,
            label: `Day ${nextN}`,
            title: "New day",
          });
        }}
      >
        <button
          type="submit"
          className="btn-ghost-add h-10 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add day
        </button>
      </form>
    </div>
  );
}
