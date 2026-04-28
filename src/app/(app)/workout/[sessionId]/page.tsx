import { notFound, redirect } from "next/navigation";
import {
  getCurrentProgram,
  getLastSessionHints,
  getSession,
  getSessionLogs,
  type ProgramExercise,
} from "@/lib/queries";
import { getPlannedReps, getPlannedWeight } from "@/lib/progression";
import { WorkoutClient, type ExerciseRow } from "./workout-client";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await getSession(sessionId);
  if (!session) notFound();
  if (session.ended_at) redirect(`/history/${sessionId}`);

  const program = await getCurrentProgram();
  if (!program) notFound();

  const day = program.days.find((d) => d.id === session.program_day_id);
  if (!day) notFound();

  const [logs, hints] = await Promise.all([
    getSessionLogs(sessionId),
    getLastSessionHints(
      day.exercises.map((e) => e.id),
      sessionId
    ),
  ]);

  const exercises: ExerciseRow[] = day.exercises.map((ex: ProgramExercise) => {
    const plannedWeight = getPlannedWeight(
      ex.start_weight,
      ex.increment,
      session.week_number,
      program.deload_weeks
    );
    const plannedReps = getPlannedReps(
      ex.base_reps,
      session.week_number,
      program.deload_weeks
    );

    const existing = logs.filter((l) => l.program_exercise_id === ex.id);
    const maxLogged = existing.reduce((m, l) => Math.max(m, l.set_number), 0);
    const setCount = Math.max(ex.sets, maxLogged);
    const sets = Array.from({ length: setCount }, (_, i) => {
      const setNumber = i + 1;
      const log = existing.find((l) => l.set_number === setNumber);
      return {
        setNumber,
        actualWeight: log?.actual_weight ?? plannedWeight,
        actualReps: log?.actual_reps ?? plannedReps,
        completed: log?.completed ?? false,
      };
    });

    return {
      id: ex.id,
      name: ex.name,
      note: ex.note,
      imageUrl: ex.image_url,
      plannedWeight,
      plannedReps,
      lastWeight: hints[ex.id]?.actual_weight ?? null,
      lastReps: hints[ex.id]?.actual_reps ?? null,
      sets,
    };
  });

  return (
    <WorkoutClient
      sessionId={sessionId}
      startedAt={session.started_at}
      weekNumber={session.week_number}
      dayLabel={day.label}
      dayTitle={day.title}
      exercises={exercises}
    />
  );
}
