// Rough per-plan time + calorie estimates. Pure and IO-free (no "server-only",
// React, or Supabase) so it runs in RSC (the program-hub day) and client
// (preset preview) alike. Every number it produces is an APPROXIMATION — UI must
// label it with "~" / "est.". The heuristics below are deliberately simple and
// exported as named constants so they're easy to tune later.

import type { StarterExercise } from "./starter-program";

export type EstimateExercise = {
  sets: number;
  base_reps: number | null;
  kind: "reps" | "time";
  target_seconds: number | null;
  tracked: boolean;
};

// Tempo + rest assumptions.
export const SECONDS_PER_REP = 3;
export const REST_COMPOUND = 90; // tracked primary lifts rest longer
export const REST_ACCESSORY = 60;
export const REST_TIME = 30; // between time-based sets / cardio intervals
export const WARMUP_BUFFER = 300; // a flat 5 min for warm-up/setup
export const DEFAULT_REPS = 10; // when base_reps is null (bodyweight "as many")
export const DEFAULT_HOLD = 45; // when a time exercise has no target

// MET (metabolic equivalent) by exercise kind — used for the calorie model.
// Resistance work ≈ 5.0; time-based work (mostly cardio in this app) ≈ 7.0.
export const MET_STRENGTH = 5.0;
export const MET_CARDIO = 7.0;

export const DEFAULT_WEIGHT_LB = 170;
export const LB_TO_KG = 0.45359237;

function effectiveReps(ex: EstimateExercise): number {
  return ex.base_reps ?? DEFAULT_REPS;
}

function holdSeconds(ex: EstimateExercise): number {
  return ex.target_seconds ?? DEFAULT_HOLD;
}

// Seconds of active training per exercise = time-under-tension + inter-set rest.
// This is the basis for BOTH duration and calories. Calories MUST be charged on
// the whole active block (not work-only): the compendium MET values for weight
// training (~5) already assume you rest between sets — that's why they're ~5 and
// not ~8 — so charging the bare time-under-tension undercounts a lifting session
// ~3-4x. The flat warm-up buffer is counted in duration but not calories.
function activeSeconds(ex: EstimateExercise): number {
  if (ex.kind === "time") return ex.sets * (holdSeconds(ex) + REST_TIME);
  const rest = ex.tracked ? REST_COMPOUND : REST_ACCESSORY;
  return ex.sets * (effectiveReps(ex) * SECONDS_PER_REP + rest);
}

// Total wall-clock estimate in seconds: active training time + a warm-up buffer.
export function estimatePlanDuration(exercises: EstimateExercise[]): number {
  if (exercises.length === 0) return 0;
  let total = WARMUP_BUFFER;
  for (const ex of exercises) total += activeSeconds(ex);
  return total;
}

// MET-model calorie estimate: kcal = MET × 3.5 × bodyKg / 200 × activeMinutes,
// summed per exercise over its active time (work + inter-set rest). BMR
// (profiles.age/gender/height) deliberately unused — MET is the standard
// activity-kcal model and BMR is a daily resting figure.
export function estimateCalories(
  exercises: EstimateExercise[],
  { weightLb = DEFAULT_WEIGHT_LB }: { weightLb?: number } = {}
): number {
  const bodyKg = weightLb * LB_TO_KG;
  let kcal = 0;
  for (const ex of exercises) {
    const met = ex.kind === "time" ? MET_CARDIO : MET_STRENGTH;
    const activeMinutes = activeSeconds(ex) / 60;
    kcal += (met * 3.5 * bodyKg) / 200 * activeMinutes;
  }
  return Math.round(kcal);
}

export function estimatePlanStats(
  exercises: EstimateExercise[],
  opts: { weightLb?: number } = {}
): { count: number; durationSec: number; calories: number } {
  return {
    count: exercises.length,
    durationSec: estimatePlanDuration(exercises),
    calories: estimateCalories(exercises, opts),
  };
}

// Adapters from a preset/library StarterExercise to the estimate + display
// shapes — shared by the preset preview and the library plan-detail page.
export function starterToEstimate(e: StarterExercise): EstimateExercise {
  return {
    sets: e.sets,
    base_reps: e.base_reps,
    kind: e.kind ?? "reps",
    target_seconds: e.target_seconds ?? null,
    tracked: e.tracked,
  };
}

export function formatStarterSets(e: StarterExercise): string {
  if (e.kind === "time" && e.target_seconds) return `${e.sets} × ${e.target_seconds}s`;
  if (e.base_reps) return `${e.sets} × ${e.base_reps}`;
  return `${e.sets} sets`;
}
