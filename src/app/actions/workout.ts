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

const FinishSchema = z.object({
  sessionId: z.string().uuid(),
  notes: z.string().optional(),
});

export async function finishWorkout(input: z.infer<typeof FinishSchema>) {
  const { sessionId, notes } = FinishSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: new Date().toISOString(), notes: notes ?? null })
    .eq("id", sessionId);
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/history");
  redirect(`/history/${sessionId}`);
}

export async function wipeAllSessions() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // set_logs cascade via FK on session_id.
  const { error } = await supabase
    .from("workout_sessions")
    .delete()
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/history");
  redirect("/today");
}
