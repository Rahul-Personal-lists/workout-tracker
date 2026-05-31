// Browser-local "today" as YYYY-MM-DD, for <input type="date"> defaults on the
// client. Server-side date keys use dateKeyInTz(getUserTimezone()) in lib/tz.
export function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
