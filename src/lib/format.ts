import type { Units } from "./units";

const LB_PER_KG = 2.20462;
const CM_PER_IN = 2.54;

export function formatWeight(
  lb: number | null | undefined,
  units: Units = "imperial"
): string {
  if (lb === null || lb === undefined) return "—";
  const value = units === "metric" ? lb / LB_PER_KG : lb;
  const suffix = units === "metric" ? "kg" : "lb";
  return `${formatNumberOneDecimal(value)} ${suffix}`;
}

export function formatWeightShort(
  lb: number | null | undefined,
  units: Units = "imperial"
): string {
  if (lb === null || lb === undefined) return "—";
  const value = units === "metric" ? lb / LB_PER_KG : lb;
  return formatNumberOneDecimal(value);
}

export function formatSignedWeight(
  lb: number | null | undefined,
  units: Units = "imperial"
): string {
  if (lb === null || lb === undefined) return "—";
  const value = units === "metric" ? lb / LB_PER_KG : lb;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}`;
}

export function unitLabel(units: Units): "lb" | "kg" {
  return units === "metric" ? "kg" : "lb";
}

export function formatVolume(
  lb: number | null | undefined,
  units: Units = "imperial"
): string {
  if (lb === null || lb === undefined) return "—";
  const value = units === "metric" ? lb / LB_PER_KG : lb;
  const suffix = units === "metric" ? "kg" : "lb";
  return `${Math.round(value).toLocaleString()} ${suffix}`;
}

export function formatLength(
  cm: number | null | undefined,
  units: Units = "imperial"
): string {
  if (cm === null || cm === undefined) return "—";
  if (units === "metric") {
    return `${Math.round(cm)} cm`;
  }
  const { ft, in: inches } = cmToFtIn(cm);
  return `${ft} ft ${inches} in`;
}

// Circumference measurements: canonical cm, displayed as decimal inches
// (imperial) or cm (metric). Distinct from formatLength, which renders height
// as ft/in.
export function circumferenceUnitLabel(units: Units): "in" | "cm" {
  return units === "metric" ? "cm" : "in";
}

export function formatCircumferenceShort(
  cm: number | null | undefined,
  units: Units = "imperial"
): string {
  if (cm === null || cm === undefined) return "—";
  const value = units === "metric" ? cm : cm / CM_PER_IN;
  return formatNumberOneDecimal(value);
}

export function formatCircumference(
  cm: number | null | undefined,
  units: Units = "imperial"
): string {
  if (cm === null || cm === undefined) return "—";
  return `${formatCircumferenceShort(cm, units)} ${circumferenceUnitLabel(units)}`;
}

export function formatSignedCircumference(
  cm: number | null | undefined,
  units: Units = "imperial"
): string {
  if (cm === null || cm === undefined) return "—";
  const value = units === "metric" ? cm : cm / CM_PER_IN;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}`;
}

export function parseCircumferenceInput(
  raw: string,
  units: Units = "imperial"
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return units === "metric" ? n : Math.round(n * CM_PER_IN * 10) / 10;
}

export function parseWeightInput(
  raw: string,
  units: Units = "imperial"
): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return units === "metric" ? Math.round(n * LB_PER_KG * 10) / 10 : n;
}

export function parseHeightCm(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n >= 300) return null;
  return Math.round(n);
}

export function parseHeightFtIn(
  feetRaw: string,
  inchesRaw: string
): number | null {
  const ftStr = feetRaw.trim();
  const inStr = inchesRaw.trim();
  if (!ftStr && !inStr) return null;
  const ft = ftStr ? Number(ftStr) : 0;
  const inch = inStr ? Number(inStr) : 0;
  if (!Number.isFinite(ft) || !Number.isFinite(inch)) return null;
  if (ft < 0 || inch < 0 || inch >= 12) return null;
  const totalInches = ft * 12 + inch;
  if (totalInches <= 0) return null;
  const cm = totalInches * CM_PER_IN;
  if (cm >= 300) return null;
  return Math.round(cm * 10) / 10;
}

export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalInches = cm / CM_PER_IN;
  const ft = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - ft * 12);
  if (inches === 12) {
    return { ft: ft + 1, in: 0 };
  }
  return { ft, in: inches };
}

function formatNumberOneDecimal(n: number): string {
  const rounded = Math.round(n * 10) / 10;
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
