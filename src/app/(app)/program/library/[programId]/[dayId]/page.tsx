import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLibraryProgram } from "@/lib/program-library";
import { getAllPrograms, getGoalWeight, getTodayWeightLb } from "@/lib/queries";
import { getUnitsServer } from "@/lib/units-server";
import {
  estimatePlanStats,
  formatStarterSets,
  starterToEstimate,
} from "@/lib/estimates";
import { getMuscleRegionsForExercise } from "@/lib/muscle-groups";
import { formatWeight } from "@/lib/format";
import { MuscleBadge } from "@/components/muscle-badge";
import { PlanStats } from "@/components/plan-stats";
import { ExerciseThumb } from "../../../exercise-thumb";
import { StartProgramButton } from "../start-program-button";

export const dynamic = "force-dynamic";

const RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]";

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ programId: string; dayId: string }>;
}) {
  const { programId, dayId } = await params;
  const program = getLibraryProgram(programId);
  if (!program) notFound();

  // Day numbering follows training days only (rest days are skipped), so the
  // day id (= day_number) maps to a 1-based "Day N" index for the header + tabs.
  const trainingDays = program.days.filter((d) => d.exercises.length > 0);
  const index = trainingDays.findIndex((d) => String(d.day_number) === dayId);
  if (index === -1) notFound();
  const day = trainingDays[index];

  const [programs, todayWeight, goalWeight, units] = await Promise.all([
    getAllPrograms(),
    getTodayWeightLb(),
    getGoalWeight(),
    getUnitsServer(),
  ]);
  const weightLb = todayWeight ?? goalWeight ?? 170;

  const stats = estimatePlanStats(day.exercises.map(starterToEstimate), { weightLb });

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href={`/program/library/${programId}`}
          aria-label="Back to program"
          className={cn(
            "h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground",
            RING,
          )}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-foreground-muted">
            Day {index + 1}
          </p>
          <h1 className="text-xl font-semibold truncate">{day.title}</h1>
        </div>
      </header>

      {trainingDays.length > 1 ? (
        <nav aria-label="Days" className="-mx-4 overflow-x-auto px-4">
          <div className="flex items-center gap-2 min-w-max">
            {trainingDays.map((d, i) => {
              const selected = i === index;
              return (
                <Link
                  key={d.day_number}
                  href={`/program/library/${programId}/${d.day_number}`}
                  aria-current={selected ? "page" : undefined}
                  className={cn(
                    "h-9 px-3.5 rounded-full inline-flex items-center text-sm font-medium border shrink-0 whitespace-nowrap",
                    RING,
                    selected
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-border text-foreground-muted",
                  )}
                >
                  Day {i + 1}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}

      <PlanStats
        exerciseCount={stats.count}
        durationSec={stats.durationSec}
        calories={stats.calories}
      />

      <ul className="space-y-2">
        {day.exercises.map((ex, i) => (
          <li
            key={i}
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
                {formatStarterSets(ex)}
                {ex.start_weight !== null
                  ? ` · from ${formatWeight(ex.start_weight, units)}`
                  : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-20 z-30 -mx-4 px-4 py-2 bg-background/90 backdrop-blur-sm">
        <StartProgramButton
          presetId={program.id}
          presetName={program.name}
          programs={programs}
        />
      </div>
    </div>
  );
}
