import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProgram, getNextWorkout } from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatWeight } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getUserTimezone, weekdayInTz } from "@/lib/tz";
import { StartWorkoutButton } from "./start-workout-button";

const MOTIVATIONS = [
  "Small reps, big gains.",
  "Show up. The rest follows.",
  "One set at a time.",
  "Stronger than yesterday.",
  "Discipline beats motivation.",
  "Make it count today.",
  "Consistency is the lift.",
];

function getGreetingName(email: string | undefined) {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._+-]/)[0] ?? local;
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function progressionHint(
  startWeight: number | null,
  increment: number,
  weekNumber: number,
  deloadWeeks: number[]
): string | null {
  if (weekNumber === 1) return "Baseline";
  if (deloadWeeks.includes(weekNumber)) return "Deload · 70%";
  let prior = 0;
  for (let w = weekNumber - 1; w >= 1; w--) {
    if (!deloadWeeks.includes(w)) {
      prior = w;
      break;
    }
  }
  if (prior === 0) return "Baseline";
  const cur = getPlannedWeight(startWeight, increment, weekNumber, deloadWeeks);
  const prev = getPlannedWeight(startWeight, increment, prior, deloadWeeks);
  if (cur === null || prev === null || cur <= prev) return null;
  return `+${formatWeight(cur - prev)} lb from W${prior}`;
}

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const name = getGreetingName(user?.email);
  const tz = await getUserTimezone();
  const motivation = MOTIVATIONS[weekdayInTz(new Date(), tz) % MOTIVATIONS.length];

  const greeting = (
    <div className="space-y-1">
      <p className="text-xl font-semibold">
        Hi, <span className="text-accent">{name}</span>
      </p>
      <p className="text-sm text-neutral-400">{motivation}</p>
    </div>
  );

  const program = await getCurrentProgram();

  if (!program) {
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 space-y-3">
          <p>You don&apos;t have a program yet.</p>
          <Link
            href="/program"
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
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 space-y-3">
          <p>{program.name} has no days yet.</p>
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

  if (next.kind === "in-progress") {
    redirect(`/workout/${next.sessionId}`);
  }

  if (next.kind === "complete") {
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm">
          <span aria-hidden="true">🎉</span> You finished all {program.weeks}{" "}
          weeks. Time to plan the next block.
        </div>
        <Link
          href="/calendar"
          className="btn-secondary w-full h-12 text-sm"
        >
          View calendar
        </Link>
      </div>
    );
  }

  const { weekNumber, day } = next;

  if (day.exercises.length === 0) {
    return (
      <div className="space-y-6 pt-8">
        {greeting}
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300 space-y-3">
          <p>
            {day.label}: {day.title} has no exercises yet.
          </p>
          <Link href="/program" className="btn-primary w-full h-12 text-sm">
            Add exercises
          </Link>
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
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          {phase} · Week {weekNumber}
          {isDeload ? " · Deload" : ""}
        </p>
        <h1 className="text-2xl font-semibold">
          {day.label}: {titleRest ? `${titleRest} ` : ""}
          <em className="font-display italic font-medium">{titleLast}</em>
        </h1>
        <p className="text-[11px] text-neutral-500 tabular-nums">
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
            program.deload_weeks
          );
          const plannedReps = getPlannedReps(
            ex.base_reps,
            weekNumber,
            program.deload_weeks
          );
          const hint = progressionHint(
            ex.start_weight,
            ex.increment,
            weekNumber,
            program.deload_weeks
          );
          return (
            <li
              key={ex.id}
              className="rounded-md border border-neutral-800 bg-neutral-900 p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm">{ex.name}</span>
                <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                  {ex.sets}×{plannedReps ?? "—"}
                  {plannedWeight !== null
                    ? ` · ${formatWeight(plannedWeight)} lb`
                    : ""}
                </span>
              </div>
              {hint ? (
                <p className="mt-1 text-[11px] text-neutral-400">{hint}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <StartWorkoutButton programDayId={day.id} weekNumber={weekNumber} />
    </div>
  );
}
