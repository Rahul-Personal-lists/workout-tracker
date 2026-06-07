import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import {
  getAllTimeTopByExercise,
  getSessionContext,
  getSessionLogs,
  getSessionPhotos,
} from "@/lib/queries";
import { SessionPhotos } from "./session-photos";
import { DurationEditor } from "./duration-editor";
import { EditableSetRow } from "./set-editor";
import { DeleteSessionButton } from "./delete-session";
import { RedoSessionButton } from "./redo-session";
import { getPlannedReps, getPlannedSeconds, getPlannedWeight } from "@/lib/progression";
import { formatDateInTz, getUserTimezone } from "@/lib/tz";
import { formatDuration, formatVolume, formatWeight } from "@/lib/format";
import { getUnitsServer } from "@/lib/units-server";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const ctx = await getSessionContext(sessionId);
  if (!ctx) notFound();
  const { session, program, day } = ctx;

  const exerciseIds = day.exercises.map((e) => e.id);
  const [logs, photos, tz, allTimeTops, units] = await Promise.all([
    getSessionLogs(sessionId),
    getSessionPhotos(sessionId),
    getUserTimezone(),
    getAllTimeTopByExercise(exerciseIds),
    getUnitsServer(),
  ]);

  const totalVolume = logs.reduce(
    (acc, l) =>
      acc +
      (l.completed && l.actual_weight !== null && l.actual_reps !== null
        ? l.actual_weight * l.actual_reps
        : 0),
    0
  );
  const completedCount = logs.filter((l) => l.completed).length;

  const titleWords = day.title.split(/\s+/);
  const titleLast = titleWords.pop() ?? "";
  const titleRest = titleWords.join(" ");

  return (
    <div className="space-y-6">
      <Link
        href="/progress"
        className="inline-flex items-center text-sm text-foreground-muted outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Progress
      </Link>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">
          Week {session.week_number} · {day.label} · {formatDateInTz(new Date(session.started_at), tz)}
        </p>
        <h1 className="text-xl font-semibold leading-tight">
          {titleRest ? `${titleRest} ` : ""}
          <em className="font-display italic font-medium">{titleLast}</em>
        </h1>
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
          <div>
            <div className="text-base tabular-nums leading-tight">
              <DurationEditor
                sessionId={session.id}
                durationSeconds={session.duration_seconds}
              />
            </div>
            <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
              Time
            </div>
          </div>
          <div>
            <div className="text-base tabular-nums leading-tight">{completedCount}</div>
            <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
              Sets
            </div>
          </div>
          <div>
            <div className="text-base tabular-nums leading-tight">
              {totalVolume > 0 ? formatVolume(totalVolume, units) : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-foreground-muted mt-0.5">
              {units === "metric" ? "Kg" : "Lb"} · Reps
            </div>
          </div>
        </div>
      </header>

      {session.notes ? (
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-foreground-muted">Notes</p>
          <p className="rounded-md border border-border bg-surface p-3 text-sm text-foreground-muted">
            {session.notes}
          </p>
        </section>
      ) : null}

      {photos.length > 0 ? <SessionPhotos photos={photos} /> : null}

      <ul className="space-y-3">
        {day.exercises.map((ex) => {
          const exLogs = logs
            .filter((l) => l.program_exercise_id === ex.id)
            .sort((a, b) => a.set_number - b.set_number);
          const isTime = ex.kind === "time";
          const fallbackPlannedWeight = isTime
            ? null
            : getPlannedWeight(
                ex.start_weight,
                ex.increment,
                session.week_number,
                program.deload_weeks,
                ex.progression_weeks,
                ex.peak_taper,
              );
          const fallbackPlannedReps = isTime
            ? null
            : getPlannedReps(
                ex.base_reps,
                session.week_number,
                program.deload_weeks,
                ex.peak_taper,
              );
          const fallbackPlannedSeconds = isTime
            ? getPlannedSeconds(
                ex.target_seconds,
                session.week_number,
                program.deload_weeks
              )
            : null;
          const expected = Array.from({ length: ex.sets }, (_, i) => {
            const setNumber = i + 1;
            const existing = exLogs.find((l) => l.set_number === setNumber);
            if (existing) return existing;
            return {
              id: `missing-${ex.id}-${setNumber}`,
              program_exercise_id: ex.id,
              set_number: setNumber,
              planned_weight: fallbackPlannedWeight,
              planned_reps: fallbackPlannedReps,
              planned_seconds: fallbackPlannedSeconds,
              actual_weight: null,
              actual_reps: null,
              actual_seconds: null,
              completed: false,
            };
          });

          const topSet = isTime
            ? null
            : exLogs.reduce<(typeof exLogs)[number] | null>((best, l) => {
                if (!l.completed || l.actual_weight === null || l.actual_reps === null) return best;
                if (!best) return l;
                const bw = best.actual_weight ?? 0;
                const br = best.actual_reps ?? 0;
                if (l.actual_weight > bw) return l;
                if (l.actual_weight === bw && l.actual_reps > br) return l;
                return best;
              }, null);

          const topTime = isTime
            ? exLogs.reduce<number | null>((best, l) => {
                if (!l.completed || l.actual_seconds === null) return best;
                if (best === null || l.actual_seconds > best) return l.actual_seconds;
                return best;
              }, null)
            : null;

          return (
            <li
              key={ex.id}
              className="rounded-lg border border-border bg-surface overflow-hidden"
            >
              <Link
                href={`/history/exercise/${ex.id}`}
                className="flex items-center gap-2 px-3 py-2 border-b border-border hover:bg-surface-hover outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
              >
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{ex.name}</span>
                {(() => {
                  if (isTime) {
                    if (topTime === null) return null;
                    return (
                      <span className="text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
                        Top today · {formatDuration(topTime)}
                      </span>
                    );
                  }
                  if (!topSet) return null;
                  const todayW = topSet.actual_weight as number;
                  const todayR = topSet.actual_reps as number;
                  const allTime = allTimeTops.get(ex.id);
                  const allTimeIsBetter =
                    allTime !== undefined &&
                    (allTime.weight > todayW ||
                      (allTime.weight === todayW && allTime.reps > todayR));
                  return (
                    <span className="text-[11px] text-foreground-muted tabular-nums whitespace-nowrap">
                      Top today · {formatWeight(todayW, units)} × {todayR}
                      {allTimeIsBetter
                        ? ` · all-time ${formatWeight(allTime.weight, units)} × ${allTime.reps}`
                        : ""}
                    </span>
                  );
                })()}
                <ChevronRight className="w-4 h-4 text-foreground-muted flex-none" />
              </Link>
              <div className="px-3 py-3 space-y-1">
                {exLogs.length === 0 ? (
                  <p className="px-1 text-sm text-foreground-muted opacity-50">Skipped</p>
                ) : (
                  expected.map((s) => (
                    <EditableSetRow
                      key={s.set_number}
                      sessionId={session.id}
                      programExerciseId={ex.id}
                      setNumber={s.set_number}
                      plannedWeight={s.planned_weight}
                      plannedReps={s.planned_reps}
                      actualWeight={s.actual_weight}
                      actualReps={s.actual_reps}
                      plannedSeconds={s.planned_seconds ?? null}
                      actualSeconds={s.actual_seconds ?? null}
                      completed={s.completed}
                      units={units}
                    />
                  ))
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="pt-4 space-y-3">
        <RedoSessionButton
          programDayId={day.id}
          weekNumber={session.week_number}
        />
        <DeleteSessionButton sessionId={session.id} />
      </div>
    </div>
  );
}
