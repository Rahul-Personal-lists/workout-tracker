import { formatInTimeZone } from "date-fns-tz";

export type RangeKind = "last" | "week" | "month" | "year";

export type ProgressBucketDef = { key: string; label: string };

export type ProgressWindow = {
  range: RangeKind;
  startKey: string; // YYYY-MM-DD inclusive (calendar date in user tz)
  endKey: string;   // YYYY-MM-DD inclusive
  anchor: string;   // YYYY-MM-DD a date inside the window
  label: string;    // human-readable: "24 May – 30 May" / "May 2026" / "2026"
  prevAnchor: string | null;
  nextAnchor: string | null;
  buckets: ProgressBucketDef[];
  bucketKind: "day" | "week" | "month";
};

// Returns the YYYY-MM-DD of the Monday at the start of the week containing
// the given date key. Used by queries.ts to bucket sessions into weekly bars.
export function mondayKeyOf(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const offset = (dow + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  const ny = date.getUTCFullYear();
  const nm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(date.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseRange(v: string | undefined): RangeKind {
  if (v === "last" || v === "month" || v === "year") return v;
  return "week";
}

export function parseAnchor(v: string | undefined, todayKey: string): string {
  return v && ISO_DATE.test(v) ? v : todayKey;
}

// All calendar math operates on UTC-midnight Date objects whose Y/M/D
// (read via getUTC*) equal the user's local calendar date. This keeps
// day-of-week and month arithmetic independent of server timezone.
function ymdToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function keyOf(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUtc(d: Date, n: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n)
  );
}

function addMonthsUtc(d: Date, n: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())
  );
}

function addYearsUtc(d: Date, n: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear() + n, d.getUTCMonth(), d.getUTCDate())
  );
}

function startOfMondayWeekUtc(d: Date): Date {
  const dow = d.getUTCDay();
  const offset = (dow + 6) % 7;
  return addDaysUtc(d, -offset);
}

function startOfMonthUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function startOfYearUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

function daysInMonthUtc(d: Date): number {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
}

function fmt(d: Date, pattern: string): string {
  return formatInTimeZone(d, "UTC", pattern);
}

export function computeProgressWindow(
  range: RangeKind,
  anchorKey: string,
  todayKey: string
): ProgressWindow {
  const anchor = ymdToDate(anchorKey);
  const today = ymdToDate(todayKey);

  switch (range) {
    case "last": {
      // Last = a single day, defaulting to the most recent workout (resolved
      // by the page). Chevrons step ±1 calendar day, capped at today on the
      // right so the user can't walk into the future.
      const day = anchor;
      const dayKey = anchorKey;
      const todayDelta = Math.round(
        (today.getTime() - day.getTime()) / 86400000
      );
      let label: string;
      if (todayDelta === 0) label = "Today";
      else if (todayDelta === 1) label = "Yesterday";
      else label = fmt(day, "EEE d MMM");
      const prevDay = addDaysUtc(day, -1);
      const nextDay = addDaysUtc(day, 1);
      return {
        range,
        startKey: dayKey,
        endKey: dayKey,
        anchor: dayKey,
        label,
        prevAnchor: keyOf(prevDay),
        nextAnchor: nextDay > today ? null : keyOf(nextDay),
        buckets: [{ key: dayKey, label: fmt(day, "d/M") }],
        bucketKind: "day",
      };
    }
    case "week": {
      const monday = startOfMondayWeekUtc(anchor);
      const sunday = addDaysUtc(monday, 6);
      const buckets: ProgressBucketDef[] = Array.from({ length: 7 }, (_, i) => {
        const d = addDaysUtc(monday, i);
        return { key: keyOf(d), label: fmt(d, "d/M") };
      });
      const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
      const label = sameMonth
        ? `${fmt(monday, "d")} – ${fmt(sunday, "d MMM")}`
        : `${fmt(monday, "d MMM")} – ${fmt(sunday, "d MMM")}`;
      const prevMonday = addDaysUtc(monday, -7);
      const nextMonday = addDaysUtc(monday, 7);
      return {
        range,
        startKey: keyOf(monday),
        endKey: keyOf(sunday),
        anchor: keyOf(monday),
        label,
        prevAnchor: keyOf(prevMonday),
        nextAnchor: nextMonday > today ? null : keyOf(nextMonday),
        buckets,
        bucketKind: "day",
      };
    }
    case "month": {
      const first = startOfMonthUtc(anchor);
      const days = daysInMonthUtc(first);
      const last = addDaysUtc(first, days - 1);
      // Weekly buckets: every Monday whose week overlaps with the month.
      // The earliest is Monday of the week containing day 1; the latest is
      // Monday of the week containing the last day. Sessions outside the
      // month are filtered out by getProgressForRange; we just provide the
      // weekly bucket keys so daily data falls into the right bar.
      const firstMonday = startOfMondayWeekUtc(first);
      const lastMonday = startOfMondayWeekUtc(last);
      const weeks =
        Math.round((lastMonday.getTime() - firstMonday.getTime()) / (7 * 86400000)) + 1;
      const buckets: ProgressBucketDef[] = Array.from({ length: weeks }, (_, i) => {
        const d = addDaysUtc(firstMonday, i * 7);
        return { key: keyOf(d), label: fmt(d, "d/M") };
      });
      const nextFirst = addMonthsUtc(first, 1);
      const todayFirst = startOfMonthUtc(today);
      return {
        range,
        startKey: keyOf(first),
        endKey: keyOf(last),
        anchor: keyOf(first),
        label: fmt(first, "MMMM yyyy"),
        prevAnchor: keyOf(addMonthsUtc(first, -1)),
        nextAnchor: nextFirst > todayFirst ? null : keyOf(nextFirst),
        buckets,
        bucketKind: "week",
      };
    }
    case "year": {
      const first = startOfYearUtc(anchor);
      const last = new Date(Date.UTC(first.getUTCFullYear(), 11, 31));
      const buckets: ProgressBucketDef[] = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.UTC(first.getUTCFullYear(), i, 1));
        return { key: keyOf(d).slice(0, 7), label: fmt(d, "MMM").toUpperCase() };
      });
      // Preserve the anchor's month/day so the grid widget shows that month
      // and prev/next can move year-by-year while keeping the same month.
      const nextAnchorDate = addYearsUtc(anchor, 1);
      const todayFirst = startOfYearUtc(today);
      const nextFirstOfYear = addYearsUtc(first, 1);
      return {
        range,
        startKey: keyOf(first),
        endKey: keyOf(last),
        anchor: anchorKey,
        label: fmt(anchor, "MMMM yyyy"),
        prevAnchor: keyOf(addYearsUtc(anchor, -1)),
        nextAnchor: nextFirstOfYear > todayFirst ? null : keyOf(nextAnchorDate),
        buckets,
        bucketKind: "month",
      };
    }
  }
}

// UTC instants padded ±1 day so a Supabase range filter on `started_at`
// (which is a UTC timestamp) catches every session whose user-tz calendar
// date sits inside [startKey, endKey]. Caller must re-filter by dateKeyInTz.
export function paddedInstantsForWindow(
  startKey: string,
  endKey: string
): { startISO: string; endISO: string } {
  const start = ymdToDate(startKey);
  const end = ymdToDate(endKey);
  start.setUTCDate(start.getUTCDate() - 1);
  end.setUTCDate(end.getUTCDate() + 2);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}
