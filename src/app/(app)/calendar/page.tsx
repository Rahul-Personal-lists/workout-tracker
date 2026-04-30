import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCalendarMonth, type CalendarDay } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { dateKeyInTz, getUserTimezone, yearMonthInTz } from "@/lib/tz";
import { MonthJump } from "./month-jump";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseMonth(
  param: string | undefined,
  tz: string
): { year: number; month: number } {
  if (param) {
    const m = /^(\d{4})-(\d{2})$/.exec(param);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (month >= 1 && month <= 12) return { year, month };
    }
  }
  return yearMonthInTz(new Date(), tz);
}

function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const tz = await getUserTimezone();
  const { year, month } = parseMonth(m, tz);
  const sessionsByDate = await getCalendarMonth(year, month, tz);

  const firstOfMonth = new Date(year, month - 1, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const today = dateKeyInTz(new Date(), tz);

  const cells: Array<{ key: string; date: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - leadingBlanks + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ key: `b${i}`, date: null, dateKey: null });
    } else {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({ key: dateKey, date: dayNum, dateKey });
    }
  }

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <MonthJump value={`${year}-${String(month).padStart(2, "0")}`}>
          <h1 className="text-2xl font-semibold leading-tight">
            {MONTH_NAMES[month - 1]}
          </h1>
          <p className="text-2xl text-neutral-500 leading-tight tabular-nums">
            {year}
          </p>
        </MonthJump>
        <div className="flex gap-2">
          <Link
            href={`/calendar?m=${prev}`}
            className="w-10 h-10 rounded-md border border-neutral-800 bg-neutral-900 flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href={`/calendar?m=${next}`}
            className="w-10 h-10 rounded-md border border-neutral-800 bg-neutral-900 flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-neutral-500 tracking-wide">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => (
          <DayCell
            key={c.key}
            date={c.date}
            day={c.dateKey ? sessionsByDate.get(c.dateKey) : undefined}
            isToday={c.dateKey === today}
          />
        ))}
      </div>

      <p className="text-[11px] text-neutral-500 text-center">
        Tap a day to review · accent ring marks today
      </p>
    </div>
  );
}

function DayCell({
  date,
  day,
  isToday,
}: {
  date: number | null;
  day: CalendarDay | undefined;
  isToday: boolean;
}) {
  if (date === null) {
    return <div aria-hidden className="aspect-square" />;
  }

  const base =
    "aspect-square rounded-md border p-1.5 flex flex-col text-left";
  const todayRing = isToday ? "ring-1 ring-accent" : "";
  const sessions = day?.sessions ?? [];
  const last = sessions[sessions.length - 1];
  const hasInProgress = sessions.some((s) => s.status === "in-progress");
  const allCompleted =
    sessions.length > 0 && sessions.every((s) => s.status === "completed");

  if (sessions.length > 0 && last) {
    const href =
      last.status === "in-progress"
        ? `/workout/${last.sessionId}`
        : `/history/${last.sessionId}`;
    const tone = hasInProgress
      ? "bg-neutral-900 border-emerald-500/60 text-emerald-300"
      : allCompleted
        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
        : "bg-neutral-900 border-neutral-700 text-white";
    return (
      <Link
        href={href}
        className={cn(base, tone, todayRing)}
        aria-label={`${sessions.length} workout${sessions.length === 1 ? "" : "s"} on day ${date}`}
      >
        <span className="text-xs font-medium tabular-nums">{date}</span>
        <span className="mt-auto flex items-center gap-1">
          {sessions.map((s, i) => (
            <span
              key={s.sessionId}
              aria-hidden
              className={cn(
                "inline-block w-1.5 h-1.5 rounded-full",
                s.status === "completed"
                  ? "bg-emerald-400"
                  : "bg-emerald-300/60",
                i > 0 ? "ml-0" : ""
              )}
            />
          ))}
        </span>
      </Link>
    );
  }

  if (isToday) {
    return (
      <div
        className={cn(
          base,
          "bg-neutral-900 border-neutral-700 text-white",
          todayRing
        )}
      >
        <span className="text-xs font-medium tabular-nums">{date}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(base, "bg-transparent border-neutral-800 text-neutral-600")}
    >
      <span className="text-xs tabular-nums">{date}</span>
    </div>
  );
}
