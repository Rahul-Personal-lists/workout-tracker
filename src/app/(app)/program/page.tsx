import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import {
  getAllPrograms,
  getCompletedSlots,
  getCurrentProgram,
  getNextWorkout,
} from "@/lib/queries";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { formatWeight } from "@/lib/format";
import { reapStaleSession } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";
import { DayControls } from "./day-controls";
import { ProgramSwitcher } from "./program-switcher";
import { PresetList } from "./preset-list";
import { DayTabs } from "./day-tabs";
import { StartWorkoutButton } from "./start-workout-button";
import type { SlotState } from "./types";

export const dynamic = "force-dynamic";

export default async function ProgramPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; day?: string }>;
}) {
  const { week: weekParam, day: dayParam } = await searchParams;

  // Reap any stale (>2h idle) in-progress sessions before reading workout state
  // — otherwise getNextWorkout treats yesterday's abandoned session as the
  // current one and the page sticks on the wrong day. Mirrors the call /today
  // used to make before /today was deleted.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await reapStaleSession(supabase, user.id);

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

  const [next, completedSlots] = await Promise.all([
    getNextWorkout(program),
    getCompletedSlots(program),
  ]);
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

  const dayIsEmpty = !!selectedDay && selectedDay.exercises.length === 0;
  const inProgress = next?.kind === "in-progress" ? next : null;

  const nextKey =
    next && (next.kind === "next" || next.kind === "in-progress")
      ? `${next.day.id}:${next.weekNumber}`
      : null;
  const selectedKey = selectedDay
    ? `${selectedDay.id}:${selectedWeek}`
    : null;

  let slotState: SlotState = "upcoming";
  if (selectedKey) {
    if (inProgress && nextKey === selectedKey) slotState = "in-progress";
    else if (completedSlots.has(selectedKey)) slotState = "completed";
    else if (nextKey === selectedKey) slotState = "today";
  }

  return (
    <div className="space-y-5 pb-4">
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
        <div className="space-y-3">
          <DayTabs
            templates={program.days.map((d) => ({ id: d.id }))}
            totalWeeks={program.weeks}
            selectedDayId={selectedDay.id}
            selectedWeek={selectedWeek}
            programId={program.id}
            completedSlots={Array.from(completedSlots)}
            nextKey={nextKey}
            inProgress={!!inProgress}
          />
          <DayControls
            dayId={selectedDay.id}
            initialTitle={selectedDay.title}
            selectedWeek={selectedWeek}
            totalWeeks={program.weeks}
            deloadWeeks={program.deload_weeks}
            programName={program.name}
            slotState={slotState}
          />
        </div>
      ) : null}

      {inProgress ? (
        <Link
          href={`/workout/${inProgress.sessionId}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground"
        >
          <span className="flex flex-col">
            <span className="font-medium">Workout in progress</span>
            <span className="text-xs text-foreground-muted">
              {inProgress.day.label}: {inProgress.day.title}
            </span>
          </span>
          <span className="text-xs font-medium uppercase tracking-wide text-accent">
            Resume
          </span>
        </Link>
      ) : null}

      {dayIsEmpty ? (
        <div className="rounded-2xl border border-border bg-surface p-5 text-center space-y-3">
          <ListChecks
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-10 h-10 text-foreground-muted mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">No exercises yet</p>
            <p className="text-sm text-foreground-muted">
              Tap the pencil to open the editor and add exercises.
            </p>
          </div>
        </div>
      ) : null}

      {selectedDay && selectedDay.exercises.length > 0 ? (
        <ul className="space-y-2">
          {selectedDay.exercises.map((ex) => {
            const plannedWeight = getPlannedWeight(
              ex.start_weight,
              ex.increment,
              selectedWeek,
              program.deload_weeks,
              ex.progression_weeks,
              ex.peak_taper,
            );
            const plannedReps = getPlannedReps(
              ex.base_reps,
              selectedWeek,
              program.deload_weeks,
              ex.peak_taper,
            );
            return (
              <li
                key={ex.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <ExerciseAnimation
                  url={ex.image_url}
                  alt={ex.name}
                  size={40}
                  shape="circle"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug truncate">
                    {ex.name}
                    {ex.note ? (
                      <span className="text-[11px] text-foreground-muted ml-1">
                        ({ex.note})
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-foreground-muted tabular-nums">
                    {ex.sets}×{plannedReps ?? "—"}
                    {plannedWeight !== null
                      ? ` · ${formatWeight(plannedWeight)} lb`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedDay &&
      selectedDay.exercises.length > 0 &&
      !inProgress &&
      slotState !== "completed" ? (
        <StartWorkoutButton
          programDayId={selectedDay.id}
          weekNumber={selectedWeek}
        />
      ) : null}
    </div>
  );
}
