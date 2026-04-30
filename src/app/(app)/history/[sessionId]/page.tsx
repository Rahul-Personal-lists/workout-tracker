import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import {
  getSessionContext,
  getSessionLogs,
  getSessionPhotos,
} from "@/lib/queries";
import { SessionPhotos } from "./session-photos";
import { DurationEditor } from "./duration-editor";
import { EditableSetRow } from "./set-editor";
import { DeleteSessionButton } from "./delete-session";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { formatDateInTz, getUserTimezone } from "@/lib/tz";
import { formatWeight } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const ctx = await getSessionContext(sessionId);
  if (!ctx) notFound();
  const { session, program, day } = ctx;

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

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Week {session.week_number} · {day.label} · {formatDateInTz(new Date(session.started_at), tz)}
        </p>
        <h1 className="text-xl font-semibold leading-tight">{day.title}</h1>
        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-neutral-900">
          <div>
            <div className="text-base tabular-nums leading-tight">
              <DurationEditor
                sessionId={session.id}
                durationSeconds={session.duration_seconds}
              />
            </div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500 mt-0.5">
              Time
            </div>
          </div>
          <div>
            <div className="text-base tabular-nums leading-tight">{completedCount}</div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500 mt-0.5">
              Sets
            </div>
          </div>
          <div>
            <div className="text-base tabular-nums leading-tight">
              {totalVolume > 0 ? Math.round(totalVolume).toLocaleString() : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-neutral-500 mt-0.5">
              Lb · Reps
            </div>
          </div>
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
            program.deload_weeks
          );
          const fallbackPlannedReps = getPlannedReps(
            ex.base_reps,
            session.week_number,
            program.deload_weeks
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

          const topSet = exLogs.reduce<(typeof exLogs)[number] | null>((best, l) => {
            if (!l.completed || l.actual_weight === null || l.actual_reps === null) return best;
            if (!best) return l;
            const bw = best.actual_weight ?? 0;
            const br = best.actual_reps ?? 0;
            if (l.actual_weight > bw) return l;
            if (l.actual_weight === bw && l.actual_reps > br) return l;
            return best;
          }, null);

          return (
            <li
              key={ex.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden"
            >
              <Link
                href={`/history/exercise/${ex.id}`}
                className="flex items-center gap-2 px-3 py-2 border-b border-neutral-900 hover:bg-neutral-800/40"
              >
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{ex.name}</span>
                {topSet ? (
                  <span className="text-[11px] text-neutral-400 tabular-nums whitespace-nowrap">
                    Top {formatWeight(topSet.actual_weight)} × {topSet.actual_reps}
                  </span>
                ) : null}
                <ChevronRight className="w-4 h-4 text-neutral-500 flex-none" />
              </Link>
              <div className="px-3 py-3 space-y-1">
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

      <div className="pt-4">
        <DeleteSessionButton sessionId={session.id} />
      </div>
    </div>
  );
}
