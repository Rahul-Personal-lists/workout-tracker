import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, ArrowLeft } from "lucide-react";
import {
  getCurrentProgram,
  getSession,
  getSessionLogs,
  getSessionPhotos,
} from "@/lib/queries";
import { SessionPhotos } from "./session-photos";
import { formatDuration, formatWeight } from "@/lib/format";

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

  const [logs, photos] = await Promise.all([
    getSessionLogs(sessionId),
    getSessionPhotos(sessionId),
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
        href="/history"
        className="inline-flex items-center text-sm text-neutral-400"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> History
      </Link>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Week {session.week_number} · {day.label} · {format(new Date(session.started_at), "MMM d, yyyy")}
        </p>
        <h1 className="text-xl font-semibold leading-tight">{day.title}</h1>
        <div className="text-[11px] text-neutral-400 tabular-nums flex gap-3 pt-1">
          <span>{formatDuration(session.duration_seconds)}</span>
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
          const expected = Array.from({ length: ex.sets }, (_, i) => {
            const setNumber = i + 1;
            return (
              exLogs.find((l) => l.set_number === setNumber) ?? {
                id: `missing-${ex.id}-${setNumber}`,
                program_exercise_id: ex.id,
                set_number: setNumber,
                planned_weight: null,
                planned_reps: null,
                actual_weight: null,
                actual_reps: null,
                completed: false,
              }
            );
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
                  <div
                    key={s.set_number}
                    className="grid grid-cols-[24px_1fr_auto] items-center gap-3 text-sm"
                  >
                    <span className="text-neutral-500 tabular-nums">{s.set_number}</span>
                    <span className="tabular-nums">
                      {s.actual_weight !== null
                        ? `${formatWeight(s.actual_weight)} lb`
                        : "—"}
                      {s.actual_reps !== null ? ` × ${s.actual_reps}` : ""}
                    </span>
                    <span className="text-[11px] text-neutral-500 tabular-nums">
                      {s.planned_weight !== null
                        ? `planned ${formatWeight(s.planned_weight)} × ${s.planned_reps ?? "—"}`
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
