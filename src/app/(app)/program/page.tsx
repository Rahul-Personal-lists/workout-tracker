import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import {
  getAllPrograms,
  getCurrentProgram,
  getNextWorkout,
} from "@/lib/queries";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { SortableExerciseList } from "./sortable-exercise-list";
import { DayControls } from "./day-controls";
import { EditableProgramName } from "./editable-program-name";
import { ProgramSwitcher } from "./program-switcher";
import { PresetList } from "./preset-list";
import { DayTabs } from "./day-tabs";
import { addDay } from "@/app/actions/program";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; day?: string }>;
}) {
  const { week: weekParam, day: dayParam } = await searchParams;
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

  const canAddProgram = allPrograms.length < 2;
  const nextDayId =
    next && (next.kind === "next" || next.kind === "in-progress")
      ? next.day.id
      : null;
  const selectedDay =
    program.days.find((d) => d.id === dayParam) ??
    program.days.find((d) => d.id === nextDayId) ??
    program.days[0] ??
    null;

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

      {selectedDay ? (
        <DayTabs
          days={program.days.map((d) => ({ id: d.id, label: d.label }))}
          selectedDayId={selectedDay.id}
          selectedWeek={selectedWeek}
        />
      ) : null}

      {selectedDay ? (
        <DayControls
          dayId={selectedDay.id}
          initialLabel={selectedDay.label}
          initialTitle={selectedDay.title}
          selectedWeek={selectedWeek}
          totalWeeks={program.weeks}
          deloadWeeks={program.deload_weeks}
          isFirst={program.days.indexOf(selectedDay) === 0}
          isLast={program.days.indexOf(selectedDay) === program.days.length - 1}
        />
      ) : null}

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
              Tap <span className="text-foreground">+ Add exercise</span> below to get started.
            </p>
          </div>
        </div>
      ) : null}

      {selectedDay ? (
        <div className="space-y-3">
          <SortableExerciseList
            dayId={selectedDay.id}
            exercises={selectedDay.exercises.map((ex) => ({
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
          <Link
            href={`/program/add?day=${selectedDay.id}&week=${selectedWeek}`}
            className="btn-ghost-add h-9 text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add exercise
          </Link>
        </div>
      ) : null}

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
        <button type="submit" className="btn-ghost-add h-10 text-xs">
          <Plus className="w-3.5 h-3.5" /> Add day
        </button>
      </form>
    </div>
  );
}
