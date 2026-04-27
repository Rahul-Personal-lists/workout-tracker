import Link from "next/link";
import { format } from "date-fns";
import { getSessionHistory } from "@/lib/queries";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const sessions = await getSessionHistory();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {sessions.length === 0
            ? "No completed workouts yet."
            : `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-400">
          Finish a workout from <Link href="/today" className="underline">Today</Link> to see it here.
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/history/${s.id}`}
                className="block rounded-lg border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-700"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs uppercase tracking-wide text-neutral-500">
                    Week {s.week_number} · {s.day_label}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {format(new Date(s.started_at), "MMM d")}
                  </span>
                </div>
                <h2 className="text-sm font-medium mt-1">{s.day_title}</h2>
                <div className="text-[11px] text-neutral-400 mt-1 tabular-nums flex gap-3">
                  <span>{formatDuration(s.duration_seconds)}</span>
                  <span>{s.set_count} sets</span>
                  {s.total_volume > 0 ? (
                    <span>{s.total_volume.toLocaleString()} lb·reps</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
