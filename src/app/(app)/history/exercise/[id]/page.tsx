import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LineChart } from "lucide-react";
import { getExerciseHistory } from "@/lib/queries";
import { formatDuration } from "@/lib/format";
import { ExerciseChart, type ChartPoint } from "./exercise-chart";

export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const history = await getExerciseHistory(id);
  if (!history) notFound();

  const isTime = history.kind === "time";

  const bySession = new Map<
    string,
    { date: string; value: number; reps: number | null }
  >();
  for (const p of history.points) {
    const value = isTime ? p.actual_seconds : p.actual_weight;
    if (value === null) continue;
    const slot = bySession.get(p.session_id);
    if (!slot || value > slot.value) {
      bySession.set(p.session_id, {
        date: p.logged_at,
        value,
        reps: isTime ? null : p.actual_reps,
      });
    }
  }

  const points: ChartPoint[] = Array.from(bySession.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: p.date,
      value: p.value,
      reps: p.reps,
    }));

  const latest = points[points.length - 1];
  const first = points[0];
  const delta = latest && first ? latest.value - first.value : null;

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
          Exercise progress
        </p>
        <h1 className="text-xl font-semibold leading-tight">{history.name}</h1>
        {points.length > 0 ? (
          <div className="flex gap-4 pt-1 text-sm tabular-nums">
            <span className="text-neutral-300">
              Latest:{" "}
              <span className="font-medium">
                {isTime
                  ? formatDuration(latest!.value)
                  : `${latest!.value} lb`}
              </span>
              {!isTime && latest!.reps !== null ? ` × ${latest!.reps}` : ""}
            </span>
            {delta !== null && delta !== 0 ? (
              <span className={delta > 0 ? "text-emerald-400" : "text-red-400"}>
                {delta > 0 ? "+" : "-"}
                {isTime
                  ? formatDuration(Math.abs(delta))
                  : `${Math.abs(delta)} lb`}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {points.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-3">
          <LineChart
            aria-hidden="true"
            strokeWidth={1.5}
            className="w-10 h-10 text-foreground-muted mx-auto"
          />
          <div className="space-y-1">
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-foreground-muted">
              Once you log this exercise, the line shows up here.
            </p>
          </div>
        </div>
      ) : (
        <ExerciseChart points={points} isTime={isTime} />
      )}
    </div>
  );
}
