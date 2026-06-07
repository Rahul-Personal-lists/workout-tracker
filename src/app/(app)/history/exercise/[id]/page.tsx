import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LineChart } from "lucide-react";
import { getExerciseHistory } from "@/lib/queries";
import { formatDuration, formatWeight } from "@/lib/format";
import { getUnitsServer } from "@/lib/units-server";
import { ExerciseChart, type ChartPoint } from "./exercise-chart";

export const dynamic = "force-dynamic";

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [history, units] = await Promise.all([
    getExerciseHistory(id),
    getUnitsServer(),
  ]);
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
    // Top set = highest value; for reps exercises, ties broken by higher reps
    // (matches getAllTimeTopByExercise and the session-detail top-set logic).
    const better =
      !slot ||
      value > slot.value ||
      (value === slot.value &&
        !isTime &&
        (p.actual_reps ?? 0) > (slot.reps ?? 0));
    if (better) {
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
        href="/progress"
        className="inline-flex items-center text-sm text-foreground-muted outline-none focus-visible:outline-2 focus-visible:outline-[color:var(--focus-ring-color)] focus-visible:outline-offset-[var(--focus-ring-offset)]"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Progress
      </Link>

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-foreground-muted">
          Exercise progress
        </p>
        <h1 className="text-xl font-semibold leading-tight">{history.name}</h1>
        {points.length > 0 ? (
          <div className="flex gap-4 pt-1 text-sm tabular-nums">
            <span className="text-foreground-muted">
              Latest:{" "}
              <span className="font-medium">
                {isTime
                  ? formatDuration(latest!.value)
                  : formatWeight(latest!.value, units)}
              </span>
              {!isTime && latest!.reps !== null ? ` × ${latest!.reps}` : ""}
            </span>
            {delta !== null && delta !== 0 ? (
              <span className={delta > 0 ? "text-emerald-400" : "text-red-400"}>
                {delta > 0 ? "+" : "-"}
                {isTime
                  ? formatDuration(Math.abs(delta))
                  : formatWeight(Math.abs(delta), units)}
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
        <ExerciseChart points={points} isTime={isTime} units={units} />
      )}
    </div>
  );
}
