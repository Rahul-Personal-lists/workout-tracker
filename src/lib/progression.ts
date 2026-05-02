export function getPlannedWeight(
  startWeight: number | null,
  increment: number,
  weekNumber: number,
  deloadWeeks: number[],
  progressionWeeks: number = 1,
): number | null {
  if (startWeight === null) return null;

  const deloadsBefore = deloadWeeks.filter((d) => d < weekNumber).length;
  const nonDeloadWeeksBefore = weekNumber - 1 - deloadsBefore;
  const linearSteps = Math.floor(
    nonDeloadWeeksBefore / Math.max(1, progressionWeeks),
  );

  if (deloadWeeks.includes(weekNumber)) {
    if (increment <= 0) return startWeight;
    // Deload always uses the linear (non-overlap) ramp as its basis so the
    // deload weight is consistent regardless of overlap mode.
    const normalWeight = startWeight + increment * linearSteps;
    const deloadRaw = normalWeight * 0.7;
    const stepsFromStart = Math.max(
      0,
      Math.round((deloadRaw - startWeight) / increment),
    );
    return startWeight + stepsFromStart * increment;
  }

  // Barbell / cable (increment ≥ 10): after a deload, restart from the
  // previous block's peak instead of continuing the linear ramp.
  // Dumbbell (increment < 10): keeps the original linear progression.
  const overlapAdj = increment >= 10 ? deloadsBefore : 0;
  const steps = Math.floor(
    Math.max(0, nonDeloadWeeksBefore - overlapAdj) /
      Math.max(1, progressionWeeks),
  );
  return startWeight + increment * steps;
}

export function getPlannedReps(
  baseReps: number | null,
  weekNumber: number,
  deloadWeeks: number[]
): number | null {
  if (baseReps === null) return null;
  if (deloadWeeks.includes(weekNumber)) return baseReps;
  if (weekNumber >= 9 && baseReps === 5) return 6;
  return baseReps;
}

export type Phase = "Foundation" | "Build" | "Peak";

export function getPhase(week: number): Phase {
  if (week <= 4) return "Foundation";
  if (week <= 8) return "Build";
  return "Peak";
}
