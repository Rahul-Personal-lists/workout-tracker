import Link from "next/link";
import { cn } from "@/lib/utils";
import { NavPending } from "@/components/nav-pending";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Mon-first grid like the reference. Builds exactly 6 rows × 7 cols of cells,
// padding with prev/next-month days so the layout never reflows.
function buildCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const daysInMonth = last.getUTCDate();
  // JS getUTCDay(): Sun=0..Sat=6 → convert to Mon=0..Sun=6 layout.
  const leading = (first.getUTCDay() + 6) % 7;

  const cells: Array<{ key: string; day: number; inMonth: boolean }> = [];
  const prevMonthLast = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  for (let i = leading - 1; i >= 0; i--) {
    const d = prevMonthLast - i;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    cells.push({
      key: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: false,
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      key: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: true,
    });
  }
  let trailing = 1;
  while (cells.length < 42) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    cells.push({
      key: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(trailing).padStart(2, "0")}`,
      day: trailing,
      inMonth: false,
    });
    trailing++;
  }
  return cells;
}

export function MonthGrid({
  year,
  month,
  sessionsByDate,
  todayKey,
}: {
  year: number;
  month: number;
  sessionsByDate: Map<string, string>;
  todayKey: string;
}) {
  const cells = buildCells(year, month);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-y-1 text-[10px] tracking-wide text-foreground-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center">
            {d}.
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5">
        {cells.map((c) => {
          const isToday = c.key === todayKey;
          const sessionId = c.inMonth ? sessionsByDate.get(c.key) : undefined;
          const numberClass = cn(
            "text-sm tabular-nums",
            !c.inMonth && "text-foreground-muted/35",
            c.inMonth && !sessionId && !isToday && "text-foreground",
            sessionId && "font-semibold text-accent",
            isToday && !sessionId && "font-semibold"
          );
          const content = (
            <span className="flex flex-col items-center gap-1">
              <span className={numberClass}>{c.day}</span>
              {sessionId ? (
                <span
                  aria-hidden="true"
                  className="block w-1 h-1 rounded-full bg-accent"
                />
              ) : isToday ? (
                <span
                  aria-hidden="true"
                  className="block w-1 h-1 rounded-full bg-foreground-muted"
                />
              ) : (
                <span aria-hidden="true" className="block w-1 h-1" />
              )}
            </span>
          );
          if (sessionId) {
            return (
              <Link
                key={c.key}
                href={`/history/${sessionId}`}
                aria-label={`Workout on ${c.key}`}
                className={cn(
                  "h-10 flex items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isToday && "ring-1 ring-accent"
                )}
              >
                <NavPending>{content}</NavPending>
              </Link>
            );
          }
          return (
            <div
              key={c.key}
              className={cn(
                "h-10 flex items-center justify-center rounded-md",
                isToday && "ring-1 ring-accent"
              )}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
