// Shared types for the /program day-pill + workout-header pieces.
//
// SlotState describes a (programDayId, weekNumber) slot's status relative to
// the user's workout history. Drives both the day-pill visual style and the
// stage label ("COMPLETED" / "IN PROGRESS" / "TODAY'S WORKOUT" / "UPCOMING
// WORKOUT") in the workout header.
export type SlotState = "completed" | "in-progress" | "today" | "upcoming";

// Stable key for completed-slot Set lookups.
export function slotKey(programDayId: string, weekNumber: number): string {
  return `${programDayId}:${weekNumber}`;
}
