import { Flame } from "lucide-react";
import {
  getLatestSessionDateKey,
  getProgressForRange,
  getSessionsByDateForMonth,
  getWeekStreak,
} from "@/lib/queries";
import { dateKeyInTz, getUserTimezone } from "@/lib/tz";
import {
  computeProgressWindow,
  parseAnchor,
  parseRange,
  type RangeKind,
} from "@/lib/progress-range";
import { RangeTabs } from "./range-tabs";
import { RangeNav } from "./range-nav";
import { MonthGrid } from "./month-grid";
import { StatCards } from "./stat-cards";
import { ProgressBarChart } from "./progress-bar-chart";
import { MuscleMap } from "./muscle-map";

export const dynamic = "force-dynamic";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; anchor?: string }>;
}) {
  const { range: rangeParam, anchor: anchorParam } = await searchParams;
  const tz = await getUserTimezone();
  const todayKey = dateKeyInTz(new Date(), tz);
  const range = parseRange(rangeParam);
  const hasExplicitAnchor =
    !!anchorParam && /^\d{4}-\d{2}-\d{2}$/.test(anchorParam);
  let anchor = parseAnchor(anchorParam, todayKey);

  // For the `Last` tab WITHOUT an explicit anchor, default to the most recent
  // workout day so the chart represents real activity. With an explicit
  // anchor (set by the chevrons), respect it so day-stepping works.
  if (range === "last" && !hasExplicitAnchor) {
    const latest = await getLatestSessionDateKey(tz);
    anchor = latest ?? todayKey;
  }

  const win = computeProgressWindow(range, anchor, todayKey);
  const [data, weekStreak] = await Promise.all([
    getProgressForRange(
      win.startKey,
      win.endKey,
      win.buckets,
      win.bucketKind,
      tz
    ),
    getWeekStreak(tz),
  ]);

  // Month/Yearly tabs show the calendar grid. For Year, the grid focuses on
  // the anchor's month so the same month visually carries year-over-year.
  let monthGridSessions: Map<string, string> | null = null;
  let monthGridYear = 0;
  let monthGridMonth = 0;
  if (range === "month" || range === "year") {
    const [yStr, mStr] = anchor.split("-");
    monthGridYear = Number(yStr);
    monthGridMonth = Number(mStr);
    monthGridSessions = await getSessionsByDateForMonth(
      monthGridYear,
      monthGridMonth,
      tz
    );
  }

  // When switching tabs, anchor on `today` if today falls inside the current
  // window — keeps Year→Month from jumping to January when the visible year
  // is the current year. Otherwise keep the user's anchor so prev/next
  // navigation in history doesn't get reset by tapping a different range.
  const todayInWindow = todayKey >= win.startKey && todayKey <= win.endKey;
  const carry = todayInWindow ? todayKey : anchor;
  const anchorForRange: Record<RangeKind, string | null> = {
    last: null,
    week: carry,
    month: carry,
    year: carry,
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-tight">Progress</h1>
        {weekStreak > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground"
            title="Consecutive weeks with at least one workout"
            aria-label={`${weekStreak}-week workout streak`}
          >
            <Flame
              aria-hidden="true"
              className="h-3.5 w-3.5 text-[color:var(--color-accent)]"
            />
            {weekStreak}-week streak
          </span>
        ) : null}
      </header>

      <RangeTabs active={range} anchorForRange={anchorForRange} />
      <RangeNav
        range={range}
        label={win.label}
        prevAnchor={win.prevAnchor}
        nextAnchor={win.nextAnchor}
      />

      {monthGridSessions ? (
        <MonthGrid
          year={monthGridYear}
          month={monthGridMonth}
          sessionsByDate={monthGridSessions}
          todayKey={todayKey}
        />
      ) : null}

      <StatCards totals={data.totals} />

      <ProgressBarChart buckets={data.buckets} />

      <MuscleMap muscleSets={data.muscleSets} />
    </div>
  );
}
