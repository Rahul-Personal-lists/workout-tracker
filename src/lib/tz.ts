import { cookies } from "next/headers";

export async function getUserTimezone(): Promise<string> {
  const tz = (await cookies()).get("tz")?.value;
  return tz && tz.length > 0 ? tz : "UTC";
}

export function dateKeyInTz(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function yearMonthInTz(d: Date, tz: string): { year: number; month: number } {
  const key = dateKeyInTz(d, tz);
  const [y, m] = key.split("-");
  return { year: Number(y), month: Number(m) };
}

export function formatDateInTz(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function weekdayInTz(d: Date, tz: string): number {
  const wk = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wk] ?? 0;
}
