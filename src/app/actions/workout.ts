"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const StartSchema = z.object({
  programDayId: z.string().uuid(),
  weekNumber: z.number().int().min(1).max(52),
});

export async function startWorkout(input: z.infer<typeof StartSchema>) {
  const { programDayId, weekNumber } = StartSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // If an in-progress session already exists, send the user to it instead
  // of creating a duplicate. Page-level redirects already cover the happy
  // path; this is the action-side guard for double-tap or stale-cache races.
  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    revalidatePath("/today");
    redirect(`/workout/${existing.id}`);
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      program_day_id: programDayId,
      week_number: weekNumber,
    })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/today");
  redirect(`/workout/${data.id}`);
}

const LogSetSchema = z.object({
  sessionId: z.string().uuid(),
  programExerciseId: z.string().uuid(),
  setNumber: z.number().int().min(1),
  plannedWeight: z.number().nullable(),
  plannedReps: z.number().int().nullable(),
  actualWeight: z.number().nullable(),
  actualReps: z.number().int().nullable(),
  completed: z.boolean(),
});

export async function logSet(input: z.infer<typeof LogSetSchema>) {
  const parsed = LogSetSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.from("set_logs").upsert(
    {
      session_id: parsed.sessionId,
      program_exercise_id: parsed.programExerciseId,
      set_number: parsed.setNumber,
      planned_weight: parsed.plannedWeight,
      planned_reps: parsed.plannedReps,
      actual_weight: parsed.actualWeight,
      actual_reps: parsed.actualReps,
      completed: parsed.completed,
      logged_at: new Date().toISOString(),
    },
    { onConflict: "session_id,program_exercise_id,set_number" }
  );
  if (error) throw error;
}

export async function editSetLog(input: z.infer<typeof LogSetSchema>) {
  const parsed = LogSetSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase.from("set_logs").upsert(
    {
      session_id: parsed.sessionId,
      program_exercise_id: parsed.programExerciseId,
      set_number: parsed.setNumber,
      planned_weight: parsed.plannedWeight,
      planned_reps: parsed.plannedReps,
      actual_weight: parsed.actualWeight,
      actual_reps: parsed.actualReps,
      completed: parsed.completed,
      logged_at: new Date().toISOString(),
    },
    { onConflict: "session_id,program_exercise_id,set_number" }
  );
  if (error) throw error;

  revalidatePath(`/history/${parsed.sessionId}`);
  revalidatePath("/calendar");
}

const EditDurationSchema = z.object({
  sessionId: z.string().uuid(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 24),
});

export async function editSessionDuration(
  input: z.infer<typeof EditDurationSchema>
) {
  const { sessionId, durationSeconds } = EditDurationSchema.parse(input);
  const supabase = await createClient();

  const { data: session, error: getErr } = await supabase
    .from("workout_sessions")
    .select("started_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (getErr) throw getErr;
  if (!session) throw new Error("Session not found");

  const ended = new Date(
    new Date(session.started_at).getTime() + durationSeconds * 1000
  ).toISOString();

  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: ended })
    .eq("id", sessionId);
  if (error) throw error;

  revalidatePath(`/history/${sessionId}`);
  revalidatePath("/calendar");
}

const FinishSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().optional(),
});

export async function finishWorkout(input: z.infer<typeof FinishSchema>) {
  const { sessionId, notes } = FinishSchema.parse(input);
  const supabase = await createClient();

  // Idempotent: only stamp ended_at the first time, but always update notes
  // so the user can correct them on a re-finish (e.g. after a flaky-wifi retry).
  const { data: existing, error: getErr } = await supabase
    .from("workout_sessions")
    .select("ended_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (getErr) throw getErr;
  if (!existing) throw new Error("Session not found");

  const update: { notes: string | null; ended_at?: string } = {
    notes: notes ?? null,
  };
  if (existing.ended_at === null) {
    update.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("workout_sessions")
    .update(update)
    .eq("id", sessionId);
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/program");
  revalidatePath(`/history/${sessionId}`);
  return { ok: true as const };
}

const PHOTO_BUCKET = "workout-photos";

const RecordPhotosSchema = z.object({
  sessionId: z.string().uuid(),
  paths: z.array(z.string().min(1)).min(1).max(6),
});

export async function recordSessionPhotos(input: z.infer<typeof RecordPhotosSchema>) {
  const { sessionId, paths } = RecordPhotosSchema.parse(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const expectedPrefix = `${user.id}/${sessionId}/`;
  for (const p of paths) {
    if (!p.startsWith(expectedPrefix)) {
      throw new Error("Invalid photo path");
    }
  }

  const { data: session, error: sessionErr } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionErr) throw sessionErr;
  if (!session) throw new Error("Session not found");

  const { error: insErr } = await supabase.from("workout_session_photos").insert(
    paths.map((p) => ({
      session_id: sessionId,
      user_id: user.id,
      storage_path: p,
    }))
  );
  if (insErr) {
    await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    throw insErr;
  }

  revalidatePath(`/history/${sessionId}`);
  return { recorded: paths.length };
}

const DeletePhotoSchema = z.object({
  photoId: z.string().uuid(),
});

export async function deleteSessionPhoto(input: z.infer<typeof DeletePhotoSchema>) {
  const { photoId } = DeletePhotoSchema.parse(input);
  const supabase = await createClient();

  const { data: photo, error: fetchErr } = await supabase
    .from("workout_session_photos")
    .select("id, session_id, storage_path")
    .eq("id", photoId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!photo) return;

  await supabase.storage.from(PHOTO_BUCKET).remove([photo.storage_path]);
  const { error: delErr } = await supabase
    .from("workout_session_photos")
    .delete()
    .eq("id", photoId);
  if (delErr) throw delErr;

  revalidatePath(`/history/${photo.session_id}`);
}

const DeleteSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function deleteSession(input: z.infer<typeof DeleteSessionSchema>) {
  const { sessionId } = DeleteSessionSchema.parse(input);
  const supabase = await createClient();

  const { data: photos, error: photoErr } = await supabase
    .from("workout_session_photos")
    .select("storage_path")
    .eq("session_id", sessionId);
  if (photoErr) throw photoErr;

  if (photos && photos.length > 0) {
    await supabase.storage
      .from(PHOTO_BUCKET)
      .remove(photos.map((p) => p.storage_path));
  }

  // set_logs and workout_session_photos cascade via FK on session_id.
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("id", sessionId);
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/program");
  redirect("/calendar");
}
