import Link from "next/link";
import { CalendarDays, Coffee, Dumbbell, Trophy } from "lucide-react";
import {
  getCurrentProgram,
  getDisplayName,
  getNextWorkout,
  getUndoableSkip,
} from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatDuration, formatWeight } from "@/lib/format";
import { reapStaleSession } from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";
import { getUserTimezone, weekdayInTz } from "@/lib/tz";
import { StartWorkoutButton } from "./start-workout-button";
import { skipRestDay, undoLastSkip } from "@/app/actions/workout";

const MOTIVATIONS = [
  "Small reps, big gains.",
  "Show up. The rest follows.",
  "One set at a time.",
  "Stronger than yesterday.",
  "Discipline beats motivation.",
  "Make it count today.",
  "Consistency is the lift.",
];

function progressionHint(
  startWeight: number | null,
  increment: number,
  weekNumber: number,
  deloadWeeks: number[],
  progressionWeeks: number,
  peakTaper: boolean,
): string | null {
  if (weekNumber === 1) return "Baseline";
  if (deloadWeeks.includes(weekNumber)) return peakTaper ? "Deload" : "Deload · 70%";
  let prior = 0;
  for (let w = weekNumber - 1; w >= 1; w--) {
    if (!deloadWeeks.includes(w)) {
      prior = w;
      break;
    }
  }
  if (prior === 0) return "Baseline";
  const cur = getPlannedWeight(startWeight, increment, weekNumber, deloadWeeks, progressionWeeks, peakTaper);
  const prev = getPlannedWeight(startWeight, increment, prior, deloadWeeks, progressionWeeks, peakTaper);
  if (cur === null || prev === null || cur <= prev) return null;
  return `+${formatWeight(cur - prev)} lb from W${prior}`;
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await reapStaleSession(supabase, user.id);

  const [name, tz, undoable, program] = await Promise.all([
    getDisplayName(),
    getUserTimezone(),
    getUndoableSkip(),
    getCurrentProgram(),
  ]);
  const motivation = MOTIVATIONS[weekdayInTz(new Date(), tz) % MOTIVATIONS.length];

  const greeting = (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xl font-semibold">
          {name ? (
            <>
              Hi, <span className="text-accent">{name}</span>
            </>
          ) : (
            "Hi there"
          )}
        </p>
        <p className="text-sm text-foreground-muted">{motivation}</p>
      </div>
      {undoable ? (
        <form action={undoLastSkip}>
          <button
            type="submit"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground-muted hover:bg-surface-hover"
          >
            <span>
              Skipped {undoable.dayLabel}: {undoable.dayTitle}
            </span>
            <span className="font-medium underline underline-offset-2">
              Undo
            </span>
          </button>
        </form>
      ) : null}
    </div>
  );

  if (!program) {
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
          <Dumbbell
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-12 h-12 text-foreground-muted mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">Start with a program</p>
            <p className="text-sm text-foreground-muted">
              Pick a template or build your own.
            </p>
          </div>
          <Link
            href="/program"
            data-tour="today-cta"
            className="btn-primary w-full h-12 text-sm"
          >
            Pick a program
          </Link>
        </div>
      </div>
    );
  }

  if (program.days.length === 0) {
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
          <CalendarDays
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-12 h-12 text-foreground-muted mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">Add days to {program.name}</p>
            <p className="text-sm text-foreground-muted">
              Set up the training days you want to follow.
            </p>
          </div>
          <Link
            href="/program"
            className="btn-primary w-full h-12 text-sm"
          >
            Set up days
          </Link>
        </div>
      </div>
    );
  }

  const next = await getNextWorkout(program);
  if (!next) return null;

  const resumeCard =
    next.kind === "in-progress" ? (
      <Link
        href={`/workout/${next.sessionId}`}
        className="flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-foreground"
      >
        <span className="flex flex-col">
          <span className="font-medium">Workout in progress</span>
          <span className="text-xs text-foreground-muted">
            {next.day.label}: {next.day.title}
          </span>
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-accent">
          Resume
        </span>
      </Link>
    ) : null;

  if (next.kind === "complete") {
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
          <Trophy
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-12 h-12 text-accent mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">You did it!</p>
            <p className="text-sm text-foreground-muted">
              Finished all {program.weeks} weeks. Time to plan the next block.
            </p>
          </div>
          <Link
            href="/calendar"
            className="btn-secondary w-full h-12 text-sm"
          >
            View calendar
          </Link>
        </div>
      </div>
    );
  }

  const { weekNumber, day } = next;

  if (day.exercises.length === 0) {
    const dayId = day.id;
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
          <Coffee
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-12 h-12 text-foreground-muted mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">Rest day?</p>
            <p className="text-sm text-foreground-muted">
              {day.label}: {day.title} has no exercises planned.
            </p>
          </div>
          <div className="space-y-2">
            <form
              action={async () => {
                "use server";
                await skipRestDay({ programDayId: dayId, weekNumber });
              }}
            >
              <button type="submit" className="btn-primary w-full h-12 text-sm">
                Skip — rest day
              </button>
            </form>
            <Link
              href={`/program/add?day=${dayId}&week=${weekNumber}`}
              className="btn-secondary w-full h-12 text-sm"
            >
              Add exercises
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const phase = getPhase(weekNumber);
  const isDeload = program.deload_weeks.includes(weekNumber);
  const titleWords = day.title.split(/\s+/);
  const titleLast = titleWords.pop() ?? "";
  const titleRest = titleWords.join(" ");
  const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  // Heuristic: ~3 min per set (work + rest), rounded to nearest 5 min for honesty.
  const estimatedMinutes = Math.max(5, Math.round((totalSets * 3) / 5) * 5);

  return (
    <div className="space-y-6 pt-8">
      {greeting}
      {resumeCard}
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">
          {phase} · Week {weekNumber}
          {isDeload ? " · Deload" : ""}
        </p>
        <h1 className="text-2xl font-semibold">
          {day.label}: {titleRest ? `${titleRest} ` : ""}
          <em className="font-display italic font-medium">{titleLast}</em>
        </h1>
        <p className="text-[11px] text-foreground-muted tabular-nums">
          ~{estimatedMinutes} min · {day.exercises.length}{" "}
          {day.exercises.length === 1 ? "exercise" : "exercises"}
        </p>
      </header>

      <ul className="space-y-2">
        {day.exercises.map((ex) => {
          const plannedWeight = getPlannedWeight(
            ex.start_weight,
            ex.increment,
            weekNumber,
            program.deload_weeks,
            ex.progression_weeks,
            ex.peak_taper,
          );
          const plannedReps = getPlannedReps(
            ex.base_reps,
            weekNumber,
            program.deload_weeks,
            ex.peak_taper,
          );
          const hint = progressionHint(
            ex.start_weight,
            ex.increment,
            weekNumber,
            program.deload_weeks,
            ex.progression_weeks,
            ex.peak_taper,
          );
          const isTime = ex.kind === "time";
          return (
            <li
              key={ex.id}
              className="rounded-2xl border border-border bg-surface p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{ex.name}</span>
                <span className="text-xs text-foreground-muted tabular-nums whitespace-nowrap">
                  {isTime
                    ? `${ex.sets} × ${ex.target_seconds !== null ? formatDuration(ex.target_seconds) : "—"}`
                    : (
                        <>
                          {ex.sets}×{plannedReps ?? "—"}
                          {plannedWeight !== null
                            ? ` · ${formatWeight(plannedWeight)} lb`
                            : ""}
                        </>
                      )}
                </span>
              </div>
              {!isTime && hint ? (
                <p className="mt-1 text-[11px] text-foreground-muted">{hint}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {next.kind === "in-progress" ? null : (
        <StartWorkoutButton programDayId={day.id} weekNumber={weekNumber} />
      )}
    </div>
  );
}
