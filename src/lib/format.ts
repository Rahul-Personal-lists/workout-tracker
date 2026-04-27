export function formatWeight(w: number | null | undefined): string {
  if (w === null || w === undefined) return "—";
  const rounded = Math.round(w * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
