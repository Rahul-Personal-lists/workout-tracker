export function getPlannedWeight(
  startWeight: number | null,
  increment: number,
  weekNumber: number,
  deloadWeeks: number[]
): number | null {
  if (startWeight === null) return null;

  const progressWeeksBefore =
    weekNumber - 1 - deloadWeeks.filter((d) => d < weekNumber).length;
  const normalWeight = startWeight + increment * progressWeeksBefore;

  if (deloadWeeks.includes(weekNumber)) {
    return Math.round((normalWeight * 0.7) / 2.5) * 2.5;
  }
  return normalWeight;
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
