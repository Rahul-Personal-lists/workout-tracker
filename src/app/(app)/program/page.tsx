import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import {
  getAllPrograms,
  getCompletedSlots,
  getCurrentProgram,
  getGoalWeight,
  getNextWorkout,
  getTodayWeightLb,
  getUndoableSkip,
} from "@/lib/queries";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { estimatePlanStats } from "@/lib/estimates";
import { getMuscleRegionsForExercise } from "@/lib/muscle-groups";
import { MuscleBadge } from "@/components/muscle-badge";
import { PlanStats } from "@/components/plan-stats";
import { ExerciseThumb } from "./exercise-thumb";
import { formatWeight } from "@/lib/format";
import { getUnitsServer } from "@/lib/units-server";
import { reapStaleSession } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";
import { DayControls } from "./day-controls";
import { ProgramSwitcher } from "./program-switcher";
import { PresetList } from "./preset-list";
import { DayTabs } from "./day-tabs";
import { StartWorkoutButton } from "./start-workout-button";
import { RestDayCard } from "./rest-day-card";
import { SkipUndoBanner } from "./skip-undo-banner";
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
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (userId) await reapStaleSession(supabase, userId);

  const [program, allPrograms, units, todayWeight, goalWeight] =
    await Promise.all([
      getCurrentProgram(),
      getAllPrograms(),
      getUnitsServer(),
      getTodayWeightLb(),
      getGoalWeight(),
    ]);

  // Bodyweight for calorie estimates: today's logged weight → goal → a default.
  const weightLb = todayWeight ?? goalWeight ?? 170;

  if (!program) {
    return (
      <div className="space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">New program</h1>
          <p className="text-xs text-neutral-500">
            Pick a template or build your own.
          </p>
        </header>
        <PresetList weightLb={weightLb} />
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

  const [next, completedSlots, undoableSkip] = await Promise.all([
    getNextWorkout(program),
    getCompletedSlots(program),
    getUndoableSkip(),
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

  const dayStats =
    selectedDay && selectedDay.exercises.length > 0
      ? estimatePlanStats(selectedDay.exercises, { weightLb })
      : null;

  const templateIndex = selectedDay
    ? program.days.findIndex((d) => d.id === selectedDay.id)
    : -1;
  const canMoveEarlier = templateIndex > 0;
  const canMoveLater =
    templateIndex >= 0 && templateIndex < program.days.length - 1;

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
      <div className="flex items-center justify-between gap-2">
        <ProgramSwitcher programs={allPrograms} canAddProgram={canAddProgram} />
        <Link
          href="/program/exercises"
          className="h-9 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface text-xs text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Exercises
        </Link>
      </div>

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
            slotState={slotState}
            canMoveEarlier={canMoveEarlier}
            canMoveLater={canMoveLater}
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

      {undoableSkip ? <SkipUndoBanner skip={undoableSkip} /> : null}

      {dayIsEmpty && selectedDay ? (
        <RestDayCard
          dayId={selectedDay.id}
          weekNumber={selectedWeek}
          slotState={slotState}
          editHref={`/program/edit?day=${selectedDay.id}&week=${selectedWeek}`}
        />
      ) : null}

      {dayStats ? (
        <PlanStats
          exerciseCount={dayStats.count}
          durationSec={dayStats.durationSec}
          calories={dayStats.calories}
        />
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
                <ExerciseThumb url={ex.image_url} alt={ex.name} />
                <MuscleBadge
                  regions={getMuscleRegionsForExercise(ex.name, ex.image_url)}
                  size={30}
                  className="shrink-0"
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
                      ? ` · ${formatWeight(plannedWeight, units)}`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {selectedDay && selectedDay.exercises.length > 0 && !inProgress ? (
        <div className="sticky bottom-20 z-30 -mx-4 px-4 py-2 bg-background/90 backdrop-blur-sm">
          <StartWorkoutButton
            programDayId={selectedDay.id}
            weekNumber={selectedWeek}
            variant={slotState === "completed" ? "redo" : "start"}
          />
        </div>
      ) : null}
    </div>
  );
}
