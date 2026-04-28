import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import {
  getCurrentProgram,
  getSession,
  getSessionLogs,
  getSessionPhotos,
} from "@/lib/queries";
import { SessionPhotos } from "./session-photos";
import { DurationEditor } from "./duration-editor";
import { EditableSetRow } from "./set-editor";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatDateInTz, getUserTimezone } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await getSession(sessionId);
  if (!session) notFound();

  const program = await getCurrentProgram({ includeArchived: true });
  const day = program?.days.find((d) => d.id === session.program_day_id);
  if (!day) notFound();

  const [logs, photos, tz] = await Promise.all([
    getSessionLogs(sessionId),
    getSessionPhotos(sessionId),
    getUserTimezone(),
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

  return (
    <div className="space-y-6">
      <Link
        href="/calendar"
        className="inline-flex items-center text-sm text-neutral-400"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Calendar
      </Link>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Week {session.week_number} · {day.label} · {formatDateInTz(new Date(session.started_at), tz)}
        </p>
        <h1 className="text-xl font-semibold leading-tight">{day.title}</h1>
        <div className="text-[11px] text-neutral-400 tabular-nums flex gap-3 pt-1">
          <DurationEditor
            sessionId={session.id}
            durationSeconds={session.duration_seconds}
          />
          <span>{completedCount} sets</span>
          {totalVolume > 0 ? (
            <span>{Math.round(totalVolume).toLocaleString()} lb·reps</span>
          ) : null}
        </div>
      </header>

      {session.notes ? (
        <p className="rounded-md border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-300">
          {session.notes}
        </p>
      ) : null}

      {photos.length > 0 ? <SessionPhotos photos={photos} /> : null}

      <ul className="space-y-3">
        {day.exercises.map((ex) => {
          const exLogs = logs
            .filter((l) => l.program_exercise_id === ex.id)
            .sort((a, b) => a.set_number - b.set_number);
          const fallbackPlannedWeight = getPlannedWeight(
            ex.start_weight,
            ex.increment,
            session.week_number,
            program?.deload_weeks ?? []
          );
          const fallbackPlannedReps = getPlannedReps(
            ex.base_reps,
            session.week_number,
            program?.deload_weeks ?? []
          );
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
              actual_weight: null,
              actual_reps: null,
              completed: false,
            };
          });

          return (
            <li
              key={ex.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden"
            >
              <Link
                href={`/history/exercise/${ex.id}`}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-neutral-800/40"
              >
                <span className="text-sm font-medium">{ex.name}</span>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </Link>
              <div className="px-3 pb-3 space-y-1">
                {expected.map((s) => (
                  <EditableSetRow
                    key={s.set_number}
                    sessionId={session.id}
                    programExerciseId={ex.id}
                    setNumber={s.set_number}
                    plannedWeight={s.planned_weight}
                    plannedReps={s.planned_reps}
                    actualWeight={s.actual_weight}
                    actualReps={s.actual_reps}
                    completed={s.completed}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
