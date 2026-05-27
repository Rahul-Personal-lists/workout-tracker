import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import {
  getAllPrograms,
  getCurrentProgram,
  getNextWorkout,
} from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { cn } from "@/lib/utils";
import { SortableExerciseList } from "./sortable-exercise-list";
import { DayControls } from "./day-controls";
import { EditableProgramName } from "./editable-program-name";
import { ProgramSwitcher } from "./program-switcher";
import { PresetList } from "./preset-list";
import { addDay } from "@/app/actions/program";

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
        <PresetList />
        <Link
          href="/program/new"
          data-tour="open-new-program"
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

  const programIsEmpty = program.days.every((d) => d.exercises.length === 0);

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <EditableProgramName programId={program.id} initialName={program.name} />
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
              data-tour="open-new-program"
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
                      ? "border-accent/60 text-accent"
                      : "border-border text-foreground-muted"
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

      <div className="text-xs uppercase tracking-wide text-foreground-muted">
        {phase} · Week {selectedWeek}
        {isDeload ? " · Deload" : ""}
        {selectedWeek === currentWeek ? " · Current" : ""}
      </div>

      {programIsEmpty ? (
        <div className="rounded-2xl border border-border bg-surface p-5 text-center space-y-3">
          <ListChecks
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-10 h-10 text-foreground-muted mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">No exercises yet</p>
            <p className="text-sm text-foreground-muted">
              Tap <span className="text-foreground">+ Add exercise</span> on any day below to get started.
            </p>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {program.days.map((day) => {
            return (
          <li
            key={day.id}
            className="rounded-2xl border border-border bg-surface"
          >
            <header className="px-3 py-2.5 border-b border-border flex items-center gap-2">
              <DayControls
                dayId={day.id}
                initialLabel={day.label}
                initialTitle={day.title}
                selectedWeek={selectedWeek}
                isFirst={program.days.indexOf(day) === 0}
                isLast={program.days.indexOf(day) === program.days.length - 1}
              />
            </header>
            <div className="px-3 py-2">
              <SortableExerciseList
                dayId={day.id}
                exercises={day.exercises.map((ex) => ({
                  id: ex.id,
                  name: ex.name,
                  note: ex.note,
                  imageUrl: ex.image_url,
                  sets: ex.sets,
                  plannedWeight: getPlannedWeight(
                    ex.start_weight,
                    ex.increment,
                    selectedWeek,
                    program.deload_weeks,
                    ex.progression_weeks,
                    ex.peak_taper,
                  ),
                  plannedReps: getPlannedReps(
                    ex.base_reps,
                    selectedWeek,
                    program.deload_weeks,
                    ex.peak_taper,
                  ),
                }))}
              />
            </div>
            <div className="px-3 pb-3 pt-1">
              <Link
                href={`/program/add?day=${day.id}&week=${selectedWeek}`}
                className="btn-ghost-add h-9 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add exercise
              </Link>
            </div>
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
