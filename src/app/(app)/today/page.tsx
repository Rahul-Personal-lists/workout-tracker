import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProgram, getNextWorkout } from "@/lib/queries";
import { getPhase, getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatWeight } from "@/lib/format";
import { startWorkout } from "@/app/actions/workout";
import { createClient } from "@/lib/supabase/server";
import { getUserTimezone, weekdayInTz } from "@/lib/tz";

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
      <h2 className="text-xl font-semibold">
        Hi, <span className="text-accent">{name}</span>
      </h2>
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
            className="block w-full h-11 leading-[2.75rem] text-center rounded-md bg-white text-black font-medium text-sm"
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
            className="block w-full h-11 leading-[2.75rem] text-center rounded-md bg-white text-black font-medium text-sm"
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
          🎉 You finished all {program.weeks} weeks. Time to plan the next block.
        </div>
        <Link
          href="/calendar"
          className="block w-full text-center h-12 leading-[3rem] rounded-md border border-neutral-800"
        >
          View calendar
        </Link>
      </div>
    );
  }

  const { weekNumber, day } = next;
  const phase = getPhase(weekNumber);
  const isDeload = program.deload_weeks.includes(weekNumber);
  const titleWords = day.title.split(/\s+/);
  const titleLast = titleWords.pop() ?? "";
  const titleRest = titleWords.join(" ");

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
          className="w-full h-14 rounded-md bg-accent text-accent-foreground font-medium text-base"
        >
          Start workout
        </button>
      </form>
    </div>
  );
}
