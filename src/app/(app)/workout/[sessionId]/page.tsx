import { notFound, redirect } from "next/navigation";
import {
  getCurrentProgram,
  getLastSessionHints,
  getPreviousDayNote,
  getProfile,
  getSession,
  getSessionLogs,
  type ProgramExercise,
} from "@/lib/queries";
import { getPlannedReps, getPlannedSeconds, getPlannedWeight } from "@/lib/progression";
import { getUnitsServer } from "@/lib/units-server";
import { WorkoutClient } from "./workout-client";
import type { ExerciseRow } from "./types";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const [session, program] = await Promise.all([
    getSession(sessionId),
    getCurrentProgram(),
  ]);
  if (!session) notFound();
  if (session.ended_at) redirect(`/history/${sessionId}`);
  if (!program) notFound();

  const day = program.days.find((d) => d.id === session.program_day_id);
  if (!day) notFound();

  const [logs, hints, previousDayNote, units, profile] = await Promise.all([
    getSessionLogs(sessionId),
    getLastSessionHints(
      day.exercises.map((e) => e.id),
      sessionId
    ),
    getPreviousDayNote(session.program_day_id, sessionId),
    getUnitsServer(),
    getProfile({ signAvatar: false }),
  ]);

  const exercises: ExerciseRow[] = day.exercises.map((ex: ProgramExercise) => {
    const isTime = ex.kind === "time";
    const plannedWeight = isTime
      ? null
      : getPlannedWeight(
          ex.start_weight,
          ex.increment,
          session.week_number,
          program.deload_weeks,
          ex.progression_weeks,
          ex.peak_taper,
        );
    const plannedReps = isTime
      ? null
      : getPlannedReps(
          ex.base_reps,
          session.week_number,
          program.deload_weeks,
          ex.peak_taper,
        );
    const plannedSeconds = isTime
      ? getPlannedSeconds(
          ex.target_seconds,
          session.week_number,
          program.deload_weeks
        )
      : null;

    const existing = logs.filter((l) => l.program_exercise_id === ex.id);
    const maxLogged = existing.reduce((m, l) => Math.max(m, l.set_number), 0);
    const setCount = Math.max(ex.sets, maxLogged);
    const sets = Array.from({ length: setCount }, (_, i) => {
      const setNumber = i + 1;
      const log = existing.find((l) => l.set_number === setNumber);
      return {
        setNumber,
        actualWeight: isTime ? null : log?.actual_weight ?? plannedWeight,
        actualReps: isTime ? null : log?.actual_reps ?? plannedReps,
        actualSeconds: isTime ? log?.actual_seconds ?? plannedSeconds : null,
        completed: log?.completed ?? false,
      };
    });

    return {
      id: ex.id,
      name: ex.name,
      note: ex.note,
      imageUrl: ex.poster_signed_url ?? ex.image_url,
      mediaKind: ex.video_path ? "video" : "image",
      videoUrl: ex.video_signed_url,
      posterUrl: ex.poster_signed_url,
      videoPath: ex.video_path,
      rect: ex.crop_rect,
      trim:
        ex.trim_start_seconds !== null && ex.trim_end_seconds !== null
          ? { startSec: ex.trim_start_seconds, endSec: ex.trim_end_seconds }
          : null,
      aspect: ex.aspect_ratio,
      kind: ex.kind,
      plannedWeight,
      plannedReps,
      plannedSeconds,
      lastWeight: isTime ? null : hints[ex.id]?.actual_weight ?? null,
      lastReps: isTime ? null : hints[ex.id]?.actual_reps ?? null,
      lastSeconds: isTime ? hints[ex.id]?.actual_seconds ?? null : null,
      sets,
    };
  });

  return (
    <WorkoutClient
      sessionId={sessionId}
      dayId={day.id}
      startedAt={session.started_at}
      weekNumber={session.week_number}
      dayLabel={day.label}
      dayTitle={day.title}
      exercises={exercises}
      previousDayNote={previousDayNote}
      units={units}
      soundLeadSeconds={profile.sound_lead_seconds}
      vibrationLeadSeconds={profile.vibration_lead_seconds}
    />
  );
}
