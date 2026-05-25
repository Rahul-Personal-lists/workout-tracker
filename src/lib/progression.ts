export function getPlannedWeight(
  startWeight: number | null,
  increment: number,
  weekNumber: number,
  deloadWeeks: number[],
  progressionWeeks: number = 1,
  peakTaper: boolean = false,
): number | null {
  if (startWeight === null) return null;

  const deloadsBefore = deloadWeeks.filter((d) => d < weekNumber).length;
  const nonDeloadWeeksBefore = weekNumber - 1 - deloadsBefore;
  const linearSteps = Math.floor(
    nonDeloadWeeksBefore / Math.max(1, progressionWeeks),
  );

  if (deloadWeeks.includes(weekNumber)) {
    if (increment <= 0) return startWeight;
    const earlierDeloads = deloadWeeks.filter((d) => d < weekNumber);
    // Final deload of a multi-deload program is a "retest" of the most recent
    // block start, not a back-off — applies to every exercise.
    const isFinalMultiDeload =
      earlierDeloads.length > 0 &&
      !deloadWeeks.some((d) => d > weekNumber);
    if (peakTaper || isFinalMultiDeload) {
      const prevDeload =
        earlierDeloads.length > 0 ? Math.max(...earlierDeloads) : 0;
      // Recurse into a non-deload week; peakTaper isn't passed because the
      // recursion target is always a work week.
      return getPlannedWeight(
        startWeight,
        increment,
        prevDeload + 1,
        deloadWeeks,
        progressionWeeks,
      );
    }
    // Default deload: 70% of the linear (non-overlap) ramp, snapped to the
    // nearest increment step, then capped at one step below the previous
    // working week so the deload is always strictly lower than what you just
    // lifted — round-half-up can otherwise land on the same step as W{N-1}.
    const normalWeight = startWeight + increment * linearSteps;
    const deloadRaw = normalWeight * 0.7;
    const rawSteps = Math.max(
      0,
      Math.round((deloadRaw - startWeight) / increment),
    );
    const prevWorkSteps = Math.floor(
      Math.max(0, nonDeloadWeeksBefore - 1 - deloadsBefore) /
        Math.max(1, progressionWeeks),
    );
    const cappedSteps = Math.max(0, Math.min(rawSteps, prevWorkSteps - 1));
    return startWeight + cappedSteps * increment;
  }

  // After a deload, restart from the previous block's peak instead of
  // continuing the linear ramp — avoids a big jump on the first working week.
  const steps = Math.floor(
    Math.max(0, nonDeloadWeeksBefore - deloadsBefore) /
      Math.max(1, progressionWeeks),
  );
  return startWeight + increment * steps;
}

export function getPlannedReps(
  baseReps: number | null,
  weekNumber: number,
  deloadWeeks: number[],
  peakTaper: boolean = false,
): number | null {
  if (baseReps === null) return null;
  if (deloadWeeks.includes(weekNumber)) {
    const earlierDeloads = deloadWeeks.filter((d) => d < weekNumber);
    const isFinalMultiDeload =
      earlierDeloads.length > 0 &&
      !deloadWeeks.some((d) => d > weekNumber);
    if (isFinalMultiDeload) {
      const prevDeload = Math.max(...earlierDeloads);
      return getPlannedReps(baseReps, prevDeload + 1, deloadWeeks, peakTaper);
    }
    return baseReps;
  }
  if (peakTaper) {
    if (weekNumber === 7 || weekNumber === 9) return Math.max(1, baseReps - 2);
    if (weekNumber === 10) return Math.max(1, baseReps - 4);
    if (weekNumber === 11) return Math.max(1, baseReps - 6);
  }
  if (weekNumber >= 9 && baseReps === 5) return 6;
  return baseReps;
}

export function getPlannedSeconds(
  targetSeconds: number | null,
  _weekNumber: number,
  _deloadWeeks: number[],
): number | null {
  return targetSeconds;
}

export type Phase = "Foundation" | "Build" | "Peak";

export function getPhase(week: number): Phase {
  if (week <= 4) return "Foundation";
  if (week <= 8) return "Build";
  return "Peak";
}
