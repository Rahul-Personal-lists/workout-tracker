import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn, FOCUS_RING as RING } from "@/lib/utils";
import { GOAL_META, SPLIT_LABEL, getLibraryProgram } from "@/lib/program-library";
import { getAllPrograms } from "@/lib/queries";
import { StartProgramButton } from "./start-program-button";

export const dynamic = "force-dynamic";

export default async function LibraryProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const { programId } = await params;
  const program = getLibraryProgram(programId);
  if (!program) notFound();

  const programs = await getAllPrograms();
  const goal = GOAL_META[program.goal];
  const trainingDays = program.days.filter((d) => d.exercises.length > 0);

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Link
          href="/program/library"
          aria-label="Back to library"
          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center border border-border bg-surface text-foreground-muted hover:text-foreground outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold truncate">{program.name}</h1>
      </header>

      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div className="relative aspect-[3/2] w-full">
          <Image
            src={program.heroImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 space-y-0.5">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              goal.color,
            )}
          >
            {goal.label}
          </p>
          <p className="text-sm text-white/85">
            {SPLIT_LABEL[program.split]}, {program.daysPerWeek} Days a Week
          </p>
          <p className="text-xs text-white/60">
            {program.weeks} weeks
            {program.deload_weeks.length
              ? ` · deloads ${program.deload_weeks.join(", ")}`
              : ""}
          </p>
        </div>
      </div>

      {program.description ? (
        <p className="text-sm text-foreground-muted">{program.description}</p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">Workouts</h2>
        <ul className="space-y-2">
          {trainingDays.map((day, i) => (
            <li key={day.day_number}>
              <Link
                href={`/program/library/${program.id}/${day.day_number}`}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5",
                  RING,
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-foreground-muted">
                    Day {i + 1}
                  </p>
                  <p className="text-sm font-medium truncate">{day.title}</p>
                  <p className="text-xs text-foreground-muted">
                    {day.exercises.length} exercises
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-foreground-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
