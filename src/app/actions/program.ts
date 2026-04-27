"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AddExerciseSchema = z.object({
  programDayId: z.string().uuid(),
  name: z.string().min(1).max(120),
  imageUrl: z.string().url().nullable(),
  sets: z.number().int().min(1).max(20),
  baseReps: z.number().int().min(0).max(200).nullable(),
  startWeight: z.number().min(0).max(2000).nullable(),
  increment: z.number().min(0).max(100),
  tracked: z.boolean(),
  note: z.string().max(120).nullable(),
  redirectWeek: z.number().int().min(1).max(52).optional(),
});

export async function addExerciseToProgram(
  input: z.infer<typeof AddExerciseSchema>
) {
  const parsed = AddExerciseSchema.parse(input);
  const supabase = await createClient();

  // Append to end of the day's existing exercises.
  const { data: maxRow, error: maxErr } = await supabase
    .from("program_exercises")
    .select("order_index")
    .eq("program_day_id", parsed.programDayId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const nextIndex = (maxRow?.order_index ?? -1) + 1;

  const { error } = await supabase.from("program_exercises").insert({
    program_day_id: parsed.programDayId,
    order_index: nextIndex,
    name: parsed.name,
    sets: parsed.sets,
    base_reps: parsed.baseReps,
    start_weight: parsed.startWeight,
    increment: parsed.increment,
    tracked: parsed.tracked,
    note: parsed.note,
    image_url: parsed.imageUrl,
  });
  if (error) throw error;

  revalidatePath("/program");
  revalidatePath("/today");

  const dest = parsed.redirectWeek
    ? `/program?week=${parsed.redirectWeek}`
    : "/program";
  redirect(dest);
}

const ArchiveExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
});

export async function archiveExerciseFromProgram(
  input: z.infer<typeof ArchiveExerciseSchema>
) {
  const { exerciseId } = ArchiveExerciseSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("program_exercises")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", exerciseId);
  if (error) throw error;

  revalidatePath("/program");
  revalidatePath("/today");
}

export async function unarchiveExerciseFromProgram(
  input: z.infer<typeof ArchiveExerciseSchema>
) {
  const { exerciseId } = ArchiveExerciseSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("program_exercises")
    .update({ archived_at: null })
    .eq("id", exerciseId);
  if (error) throw error;

  revalidatePath("/program");
  revalidatePath("/today");
}
