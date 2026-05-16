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

// "1:30" → 90, "0:45" → 45, "90" → 90, "" / invalid → null.
// Bare numbers without a colon are interpreted as seconds.
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length !== 2) return null;
    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    const total = Math.round(minutes * 60 + seconds);
    return total > 0 ? total : null;
  }

  const bare = Number(trimmed);
  if (!Number.isFinite(bare) || bare <= 0) return null;
  return Math.round(bare);
}
