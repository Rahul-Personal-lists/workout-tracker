import { Flame, Percent, Ruler, Scale, type LucideIcon } from "lucide-react";
import type { Units } from "./units";
import {
  CM_PER_IN,
  circumferenceUnitLabel,
  formatCircumference,
  formatCircumferenceShort,
  formatNumberOneDecimal,
  formatSignedCircumference,
  formatSignedWeight,
  formatWeight,
  formatWeightShort,
  LB_PER_KG,
  parseCircumferenceInput,
  parseWeightInput,
  unitLabel,
} from "./format";

export const MEASUREMENT_KEYS = [
  "chest",
  "waist",
  "hips",
  "bicep",
  "thigh",
] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

export type MetricKey = "weight" | "bodyfat" | "calories" | MeasurementKey;
export type MetricKind = "weight" | "percent" | "count" | "length";
export type MetricSource = "body_logs" | "body_measurements";

export type MetricConfig = {
  key: MetricKey;
  label: string;
  kind: MetricKind;
  source: MetricSource;
  icon: LucideIcon;
  /** Convert the canonical stored value to the user's display unit (for charts). */
  toDisplay: (canonical: number, units: Units) => number;
  /** Short numeric string, no unit. */
  formatShort: (value: number | null | undefined, units: Units) => string;
  /** Value with unit suffix. */
  format: (value: number | null | undefined, units: Units) => string;
  /** Signed delta, no unit. */
  formatSigned: (value: number | null | undefined, units: Units) => string;
  /** Unit label for the current units (e.g. "lb", "in", "%"). */
  unitLabel: (units: Units) => string;
  /** Parse a user-entered string into the canonical stored value. */
  parse: (raw: string, units: Units) => number | null;
};

function lengthMetric(key: MeasurementKey, label: string): MetricConfig {
  return {
    key,
    label,
    kind: "length",
    source: "body_measurements",
    icon: Ruler,
    toDisplay: (cm, units) => (units === "metric" ? cm : cm / CM_PER_IN),
    formatShort: formatCircumferenceShort,
    format: formatCircumference,
    formatSigned: formatSignedCircumference,
    unitLabel: circumferenceUnitLabel,
    parse: parseCircumferenceInput,
  };
}

function formatNum(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return formatNumberOneDecimal(value);
}

export const WEIGHT_METRIC: MetricConfig = {
  key: "weight",
  label: "Weight",
  kind: "weight",
  source: "body_logs",
  icon: Scale,
  toDisplay: (lb, units) => (units === "metric" ? lb / LB_PER_KG : lb),
  formatShort: formatWeightShort,
  format: formatWeight,
  formatSigned: formatSignedWeight,
  unitLabel,
  parse: parseWeightInput,
};

export const BODYFAT_METRIC: MetricConfig = {
  key: "bodyfat",
  label: "Body fat",
  kind: "percent",
  source: "body_logs",
  icon: Percent,
  toDisplay: (v) => v,
  formatShort: (v) => formatNum(v),
  format: (v) => (v === null || v === undefined ? "—" : `${formatNum(v)}%`),
  formatSigned: (v) => {
    if (v === null || v === undefined) return "—";
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    return `${sign}${Math.abs(v).toFixed(1)}`;
  },
  unitLabel: () => "%",
  parse: (raw) => {
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
    return n;
  },
};

export const CALORIES_METRIC: MetricConfig = {
  key: "calories",
  label: "Calories",
  kind: "count",
  source: "body_logs",
  icon: Flame,
  toDisplay: (v) => v,
  formatShort: (v) =>
    v === null || v === undefined ? "—" : Math.round(v).toLocaleString(),
  format: (v) =>
    v === null || v === undefined ? "—" : `${Math.round(v).toLocaleString()} cal`,
  formatSigned: (v) => {
    if (v === null || v === undefined) return "—";
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    return `${sign}${Math.abs(Math.round(v)).toLocaleString()}`;
  },
  unitLabel: () => "cal",
  parse: (raw) => {
    const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  },
};

export const METRICS: MetricConfig[] = [
  WEIGHT_METRIC,
  BODYFAT_METRIC,
  CALORIES_METRIC,
  lengthMetric("chest", "Chest"),
  lengthMetric("waist", "Waist"),
  lengthMetric("hips", "Hips"),
  lengthMetric("bicep", "Bicep"),
  lengthMetric("thigh", "Thigh"),
];

export const METRIC_BY_KEY: Record<MetricKey, MetricConfig> = Object.fromEntries(
  METRICS.map((m) => [m.key, m])
) as Record<MetricKey, MetricConfig>;
