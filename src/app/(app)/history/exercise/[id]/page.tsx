import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getExerciseHistory } from "@/lib/queries";
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

  const bySession = new Map<
    string,
    { date: string; topWeight: number; topReps: number | null }
  >();
  for (const p of history.points) {
    if (p.actual_weight === null) continue;
    const slot = bySession.get(p.session_id);
    if (!slot || p.actual_weight > slot.topWeight) {
      bySession.set(p.session_id, {
        date: p.logged_at,
        topWeight: p.actual_weight,
        topReps: p.actual_reps,
      });
    }
  }

  const points: ChartPoint[] = Array.from(bySession.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: p.date,
      weight: p.topWeight,
      reps: p.topReps,
    }));

  const latest = points[points.length - 1];
  const first = points[0];
  const delta =
    latest && first ? latest.weight - first.weight : null;

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
          Exercise progress
        </p>
        <h1 className="text-xl font-semibold leading-tight">{history.name}</h1>
        {points.length > 0 ? (
          <div className="flex gap-4 pt-1 text-sm tabular-nums">
            <span className="text-neutral-300">
              Latest: <span className="font-medium">{latest!.weight} lb</span>
              {latest!.reps !== null ? ` × ${latest!.reps}` : ""}
            </span>
            {delta !== null && delta !== 0 ? (
              <span className={delta > 0 ? "text-emerald-400" : "text-red-400"}>
                {delta > 0 ? "+" : ""}
                {delta} lb
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {points.length === 0 ? (
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          No completed sets yet. Once you log this exercise, the line shows up here.
        </div>
      ) : (
        <ExerciseChart points={points} />
      )}
    </div>
  );
}
