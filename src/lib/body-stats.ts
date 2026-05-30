export type Range = "1m" | "3m" | "6m" | "1y" | "all";

export type DatedWeight = {
  date: string;
  weight: number;
};

export function rangeAlphaFor(range: Range): number {
  const n = range === "1y" || range === "all" ? 14 : 7;
  return 2 / (n + 1);
}

export function emaSeries(points: DatedWeight[], alpha: number): number[] {
  if (points.length === 0) return [];
  const out: number[] = [points[0].weight];
  for (let i = 1; i < points.length; i++) {
    out.push(alpha * points[i].weight + (1 - alpha) * out[i - 1]);
  }
  return out;
}

function todayKey(today = new Date()): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// One window definition shared by windowSeries (the filter) and padToWindow
// (the axis), so a point exactly at the boundary can't be kept by one and
// dropped by the other. The window spans [today - N, today] inclusive.
const WINDOW_DAYS: Record<Exclude<Range, "all">, number> = {
  "1m": 30,
  "3m": 90,
  "6m": 180,
  "1y": 365,
};

function windowStartKey(range: Exclude<Range, "all">, today: Date): string {
  return shiftDays(todayKey(today), -WINDOW_DAYS[range]);
}

export function windowSeries<T extends { date: string }>(
  points: T[],
  range: Range,
  today = new Date()
): T[] {
  if (range === "all") return points;
  const startKey = windowStartKey(range, today);
  return points.filter((p) => p.date >= startKey);
}

export function padToWindow<T extends { date: string }>(
  points: T[],
  empty: (date: string) => T,
  range: Range,
  today = new Date()
): T[] {
  if (range === "all") return points;
  const realByDate = new Map(points.map((p) => [p.date, p]));
  const out: T[] = [];
  const startKey = windowStartKey(range, today);
  const endKey = todayKey(today);
  let cursor = startKey;
  while (cursor <= endKey) {
    out.push(realByDate.get(cursor) ?? empty(cursor));
    cursor = shiftDays(cursor, 1);
  }
  return out;
}

export function pointsInLastDays<T extends { date: string }>(
  points: T[],
  days: number,
  today = new Date()
): T[] {
  const cutoff = shiftDays(todayKey(today), -days);
  return points.filter((p) => p.date > cutoff);
}

export function pointsInDayRange<T extends { date: string }>(
  points: T[],
  fromDaysAgo: number,
  toDaysAgo: number,
  today = new Date()
): T[] {
  const start = shiftDays(todayKey(today), -fromDaysAgo);
  const end = shiftDays(todayKey(today), -toDaysAgo);
  return points.filter((p) => p.date > start && p.date <= end);
}

export function avgWeight(points: DatedWeight[]): number | null {
  if (points.length === 0) return null;
  return points.reduce((s, p) => s + p.weight, 0) / points.length;
}

export function weeklyRateFromEma(
  points: DatedWeight[],
  ema: number[],
  windowDays = 14
): number | null {
  if (points.length < 7 || ema.length !== points.length) return null;
  const tailCount = Math.min(windowDays, points.length);
  const tailPts = points.slice(-tailCount);
  const tailEma = ema.slice(-tailCount);
  const firstD = new Date(tailPts[0].date + "T00:00:00").getTime();
  const lastD = new Date(tailPts[tailCount - 1].date + "T00:00:00").getTime();
  const days = (lastD - firstD) / (24 * 60 * 60 * 1000);
  if (days <= 0) return null;
  const delta = tailEma[tailCount - 1] - tailEma[0];
  return (delta / days) * 7;
}

export function predictGoalDate(
  currentAvg: number,
  goalWeight: number,
  weeklyRate: number,
  fromDate = new Date()
): Date | null {
  if (!Number.isFinite(weeklyRate) || weeklyRate === 0) return null;
  if (currentAvg === goalWeight) return new Date(fromDate);
  const direction = goalWeight < currentAvg ? -1 : 1;
  if (Math.sign(weeklyRate) !== direction) return null;
  const weeks = (goalWeight - currentAvg) / weeklyRate;
  if (weeks <= 0 || !Number.isFinite(weeks)) return null;
  const result = new Date(fromDate);
  result.setDate(result.getDate() + Math.round(weeks * 7));
  return result;
}
