"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPreset, type StarterProgram } from "@/lib/starter-program";

const MAX_PROGRAMS = 2;

const AddExerciseSchema = z.object({
  programDayId: z.string().uuid(),
  name: z.string().min(1).max(120),
  imageUrl: z.string().min(1).max(500).nullable(),
  sets: z.number().int().min(1).max(20),
  baseReps: z.number().int().min(0).max(200).nullable(),
  startWeight: z.number().min(0).max(2000).nullable(),
  increment: z.number().min(0).max(100),
  tracked: z.boolean(),
  note: z.string().max(120).nullable(),
  progressionWeeks: z.number().int().min(1).max(8).default(1),
  redirectWeek: z.number().int().min(1).max(52).optional(),
});

export async function addExerciseToProgram(
  input: z.infer<typeof AddExerciseSchema>
) {
  const parsed = AddExerciseSchema.parse(input);
  const supabase = await createClient();

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
    progression_weeks: parsed.progressionWeeks,
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

// ──────────────────────────────────────────────
// Program creation / activation / archive
// ──────────────────────────────────────────────

async function assertSlotAvailable(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { count, error } = await supabase
    .from("programs")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  if (error) throw error;
  if ((count ?? 0) >= MAX_PROGRAMS) {
    throw new Error(`You can have up to ${MAX_PROGRAMS} programs. Archive one to add another.`);
  }
}

async function demoteActivePrograms(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { error } = await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) throw error;
}

async function insertPresetData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  preset: StarterProgram
) {
  for (const day of preset.days) {
    const { data: dayRow, error: dayErr } = await supabase
      .from("program_days")
      .insert({
        program_id: programId,
        day_number: day.day_number,
        label: day.label,
        title: day.title,
      })
      .select("id")
      .single();
    if (dayErr) throw dayErr;

    if (day.exercises.length === 0) continue;
    const exerciseRows = day.exercises.map((ex, i) => ({
      program_day_id: dayRow.id,
      order_index: i,
      name: ex.name,
      sets: ex.sets,
      base_reps: ex.base_reps,
      start_weight: ex.start_weight,
      increment: ex.increment,
      tracked: ex.tracked,
      note: ex.note ?? null,
      image_url: ex.image_url,
      progression_weeks: ex.progression_weeks ?? 1,
    }));
    const { error: exErr } = await supabase
      .from("program_exercises")
      .insert(exerciseRows);
    if (exErr) throw exErr;
  }
}

const SeedPresetSchema = z.object({ presetId: z.string().min(1) });

export async function seedPresetProgram(
  input: z.infer<typeof SeedPresetSchema>
) {
  const { presetId } = SeedPresetSchema.parse(input);
  const preset = getPreset(presetId);
  if (!preset) throw new Error(`Unknown preset: ${presetId}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await assertSlotAvailable(supabase);
  await demoteActivePrograms(supabase, user.id);

  const { data: programRow, error: progErr } = await supabase
    .from("programs")
    .insert({
      user_id: user.id,
      name: preset.name,
      weeks: preset.weeks,
      deload_weeks: preset.deload_weeks,
      is_active: true,
    })
    .select("id")
    .single();
  if (progErr) throw progErr;

  await insertPresetData(supabase, programRow.id, preset);

  revalidatePath("/program");
  revalidatePath("/today");
  redirect("/today");
}

const CreateBlankSchema = z.object({
  name: z.string().min(1).max(80),
  weeks: z.number().int().min(1).max(52),
  deloadWeeks: z.array(z.number().int().min(1).max(52)),
  days: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        title: z.string().min(1).max(80),
      })
    )
    .min(1)
    .max(7),
});

export async function createBlankProgram(
  input: z.infer<typeof CreateBlankSchema>
) {
  const parsed = CreateBlankSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const validDeloads = parsed.deloadWeeks.filter((w) => w >= 1 && w <= parsed.weeks);

  await assertSlotAvailable(supabase);
  await demoteActivePrograms(supabase, user.id);

  const { data: programRow, error: progErr } = await supabase
    .from("programs")
    .insert({
      user_id: user.id,
      name: parsed.name,
      weeks: parsed.weeks,
      deload_weeks: validDeloads,
      is_active: true,
    })
    .select("id")
    .single();
  if (progErr) throw progErr;

  const dayRows = parsed.days.map((d, i) => ({
    program_id: programRow.id,
    day_number: i + 1,
    label: d.label,
    title: d.title,
  }));
  const { error: dayErr } = await supabase.from("program_days").insert(dayRows);
  if (dayErr) throw dayErr;

  revalidatePath("/program");
  revalidatePath("/today");
  redirect("/program");
}

const ProgramIdSchema = z.object({ programId: z.string().uuid() });

export async function setActiveProgram(
  input: z.infer<typeof ProgramIdSchema>
) {
  const { programId } = ProgramIdSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: inProgress, error: ipErr } = await supabase
    .from("workout_sessions")
    .select("id")
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (ipErr) throw ipErr;
  if (inProgress) {
    throw new Error("Finish your in-progress workout before switching programs.");
  }

  // Demote first to free the partial unique index, then promote.
  await demoteActivePrograms(supabase, user.id);
  const { error } = await supabase
    .from("programs")
    .update({ is_active: true })
    .eq("id", programId);
  if (error) throw error;

  revalidatePath("/program");
  revalidatePath("/today");
}

export async function archiveProgram(
  input: z.infer<typeof ProgramIdSchema>
) {
  const { programId } = ProgramIdSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: target, error: tErr } = await supabase
    .from("programs")
    .select("id, is_active")
    .eq("id", programId)
    .maybeSingle();
  if (tErr) throw tErr;
  if (!target) throw new Error("Program not found.");

  // Demote and archive in two steps to keep the partial unique index happy.
  const { error: demErr } = await supabase
    .from("programs")
    .update({ is_active: false })
    .eq("id", programId);
  if (demErr) throw demErr;

  const { error: archErr } = await supabase
    .from("programs")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", programId);
  if (archErr) throw archErr;

  // If we just archived the active one, promote the other (if any).
  if (target.is_active) {
    const { data: other } = await supabase
      .from("programs")
      .select("id")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (other) {
      const { error } = await supabase
        .from("programs")
        .update({ is_active: true })
        .eq("id", other.id);
      if (error) throw error;
    }
  }

  revalidatePath("/program");
  revalidatePath("/today");
}

// ──────────────────────────────────────────────
// Program-level editing
// ──────────────────────────────────────────────

const RenameProgramSchema = z.object({
  programId: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function renameProgram(
  input: z.infer<typeof RenameProgramSchema>
) {
  const parsed = RenameProgramSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ name: parsed.name })
    .eq("id", parsed.programId);
  if (error) throw error;
  revalidatePath("/program");
  revalidatePath("/today");
}

// ──────────────────────────────────────────────
// Day-level editing
// ──────────────────────────────────────────────

const RenameDaySchema = z.object({
  dayId: z.string().uuid(),
  label: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
});

export async function renameDay(input: z.infer<typeof RenameDaySchema>) {
  const parsed = RenameDaySchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("program_days")
    .update({ label: parsed.label, title: parsed.title })
    .eq("id", parsed.dayId);
  if (error) throw error;
  revalidatePath("/program");
  revalidatePath("/today");
}

const AddDaySchema = z.object({
  programId: z.string().uuid(),
  label: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
});

export async function addDay(input: z.infer<typeof AddDaySchema>) {
  const parsed = AddDaySchema.parse(input);
  const supabase = await createClient();

  const { data: maxRow, error: maxErr } = await supabase
    .from("program_days")
    .select("day_number")
    .eq("program_id", parsed.programId)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const nextDay = (maxRow?.day_number ?? 0) + 1;

  const { error } = await supabase.from("program_days").insert({
    program_id: parsed.programId,
    day_number: nextDay,
    label: parsed.label,
    title: parsed.title,
  });
  if (error) throw error;

  revalidatePath("/program");
  revalidatePath("/today");
}

const ReorderDaySchema = z.object({
  dayId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export async function reorderDay(input: z.infer<typeof ReorderDaySchema>) {
  const { dayId, direction } = ReorderDaySchema.parse(input);
  const supabase = await createClient();

  const { data: target, error: tErr } = await supabase
    .from("program_days")
    .select("id, program_id, day_number")
    .eq("id", dayId)
    .single();
  if (tErr || !target) throw tErr ?? new Error("Day not found");

  const { data: siblings, error: sErr } = await supabase
    .from("program_days")
    .select("id, day_number")
    .eq("program_id", target.program_id)
    .is("archived_at", null)
    .order("day_number", { ascending: true });
  if (sErr) throw sErr;

  const idx = siblings.findIndex((d) => d.id === dayId);
  const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
  if (neighborIdx < 0 || neighborIdx >= siblings.length) return;

  const neighbor = siblings[neighborIdx];
  const { error } = await supabase.rpc("swap_day_order", {
    p_day_a: dayId,
    p_day_b: neighbor.id,
  });
  if (error) throw error;

  revalidatePath("/program");
  revalidatePath("/today");
}

const DayIdSchema = z.object({ dayId: z.string().uuid() });

export async function archiveDay(input: z.infer<typeof DayIdSchema>) {
  const { dayId } = DayIdSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("program_days")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", dayId);
  if (error) throw error;
  revalidatePath("/program");
  revalidatePath("/today");
}

export async function unarchiveDay(input: z.infer<typeof DayIdSchema>) {
  const { dayId } = DayIdSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("program_days")
    .update({ archived_at: null })
    .eq("id", dayId);
  if (error) throw error;
  revalidatePath("/program");
  revalidatePath("/today");
}
