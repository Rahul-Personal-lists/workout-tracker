// Pure planner for program_days ordering. Given a program's day rows, returns
// the target day_number + label for EVERY row so that: live days are contiguous
// 1..N in the resolved order with auto "Day N" labels synced to position (custom
// labels preserved), and archived days are parked at N+1..N+M (labels untouched).
// No DB / no "server-only" import so it can be smoke-tested directly under tsx.

export type DayRow = {
  id: string;
  day_number: number;
  label: string;
  archived_at: string | null;
};

export type DayOrderTarget = { id: string; day_number: number; label: string };

// Matches ONLY the auto-generated "Day N" labels, so custom labels like
// "Squat day" are never rewritten.
const AUTO_LABEL = /^Day \d+$/;

export function planDayOrder(
  days: DayRow[],
  explicitLiveOrder?: string[],
): DayOrderTarget[] {
  const live = days.filter((d) => d.archived_at === null);
  const archived = days.filter((d) => d.archived_at !== null);

  const byNumber = (a: DayRow, b: DayRow) => a.day_number - b.day_number;
  const liveByNumber = live.slice().sort(byNumber);

  // Resolve the live order. With an explicit order, keep only ids that are
  // actually live (deduped), then append any live ids the caller omitted (in
  // day_number order) so a stale caller list can never drop a row.
  let orderedLive: DayRow[];
  if (explicitLiveOrder) {
    const liveById = new Map(live.map((d) => [d.id, d]));
    const seen = new Set<string>();
    const picked: DayRow[] = [];
    for (const id of explicitLiveOrder) {
      const row = liveById.get(id);
      if (row && !seen.has(id)) {
        seen.add(id);
        picked.push(row);
      }
    }
    for (const row of liveByNumber) {
      if (!seen.has(row.id)) picked.push(row);
    }
    orderedLive = picked;
  } else {
    orderedLive = liveByNumber;
  }

  const targets: DayOrderTarget[] = [];
  orderedLive.forEach((d, i) => {
    const pos = i + 1;
    targets.push({
      id: d.id,
      day_number: pos,
      label: AUTO_LABEL.test(d.label) ? `Day ${pos}` : d.label,
    });
  });

  archived
    .slice()
    .sort(byNumber)
    .forEach((d, j) => {
      targets.push({
        id: d.id,
        day_number: orderedLive.length + 1 + j,
        label: d.label,
      });
    });

  return targets;
}
