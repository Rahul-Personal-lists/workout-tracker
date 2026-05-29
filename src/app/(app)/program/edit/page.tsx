import { notFound } from "next/navigation";
import { getCurrentProgram, getNextWorkout } from "@/lib/queries";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { getUnitsServer } from "@/lib/units-server";
import { EditDayClient } from "./edit-client";

export const dynamic = "force-dynamic";

export default async function ProgramEditPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; week?: string }>;
}) {
  const { day: dayParam, week: weekParam } = await searchParams;
  const [program, units] = await Promise.all([
    getCurrentProgram(),
    getUnitsServer(),
  ]);
  if (!program) notFound();

  const next = await getNextWorkout(program);
  const currentWeek =
    next && (next.kind === "next" || next.kind === "in-progress")
      ? next.weekNumber
      : 1;
  const parsed = weekParam ? parseInt(weekParam, 10) : NaN;
  const selectedWeek =
    Number.isFinite(parsed) && parsed >= 1 && parsed <= program.weeks
      ? parsed
      : currentWeek;

  const nextDayId =
    next && (next.kind === "next" || next.kind === "in-progress")
      ? next.day.id
      : null;
  const day =
    program.days.find((d) => d.id === dayParam) ??
    program.days.find((d) => d.id === nextDayId) ??
    program.days[0];
  if (!day) notFound();

  const isToday =
    !!next &&
    (next.kind === "next" || next.kind === "in-progress") &&
    day.id === next.day.id &&
    selectedWeek === next.weekNumber;

  const exercises = day.exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    note: ex.note,
    imageUrl: ex.image_url,
    sets: ex.sets,
    plannedWeight: getPlannedWeight(
      ex.start_weight,
      ex.increment,
      selectedWeek,
      program.deload_weeks,
      ex.progression_weeks,
      ex.peak_taper,
    ),
    plannedReps: getPlannedReps(
      ex.base_reps,
      selectedWeek,
      program.deload_weeks,
      ex.peak_taper,
    ),
  }));

  return (
    <EditDayClient
      dayId={day.id}
      dayTitle={day.title}
      selectedWeek={selectedWeek}
      isToday={isToday}
      exercises={exercises}
      units={units}
    />
  );
}
