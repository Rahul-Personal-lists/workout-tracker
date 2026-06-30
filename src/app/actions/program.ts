"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireUser } from "@/lib/supabase/server";
import { getPreset, type StarterProgram } from "@/lib/starter-program";
import { mediaSnapshotError } from "@/lib/media-snapshot";
import { planDayOrder, type DayRow } from "@/lib/day-order";

const MAX_PROGRAMS = 2;

const CropRectSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().gt(0).max(1),
    h: z.number().gt(0).max(1),
  })
  .nullable();

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
  kind: z.enum(["reps", "time"]).default("reps"),
  targetSeconds: z.number().int().positive().max(36000).nullable().default(null),
  redirectWeek: z.number().int().min(1).max(52).optional(),
  // Same-origin path the caller wants to land on after a successful add.
  // Used by the mid-workout add flow to bounce back to /workout/[sessionId].
  returnTo: z.string().regex(/^\/[^/]/).max(200).optional(),
  // Custom-video snapshot, captured AT ADD TIME by copying a custom_exercises
  // library entry onto this program_exercises row. Load-bearing — same contract
  // as planned_* in set_logs: later editing or soft-deleting the library entry
  // must NOT rewrite what an existing program row points at, so history +
  // playback stay accurate. All null/empty for catalog exercises -> the row
  // behaves exactly as before.
  customExerciseId: z.string().uuid().nullable().default(null),
  videoPath: z.string().max(500).nullable().default(null),
  posterPath: z.string().max(500).nullable().default(null),
  cropRect: CropRectSchema.default(null),
  trimStartSeconds: z.number().min(0).max(36000).nullable().default(null),
  trimEndSeconds: z.number().gt(0).max(36000).nullable().default(null),
  aspectRatio: z.number().gt(0).max(10).nullable().default(null),
  muscles: z.array(z.string()).max(17).default([]),
});

export async function addExerciseToProgram(
  input: z.input<typeof AddExerciseSchema>
) {
  const parsed = AddExerciseSchema.parse(input);
  const { supabase, user } = await requireUser();

  // A snapshotted custom must arrive scoped to its source library entry: poster
  // mandatory when any media is present, video optional (photo-only customs).
  const snapErr = mediaSnapshotError(user.id, {
    customExerciseId: parsed.customExerciseId,
    videoPath: parsed.videoPath,
    posterPath: parsed.posterPath,
  });
  if (snapErr) throw new Error(snapErr);

  const { data: maxRow, error: maxErr } = await supabase
    .from("program_exercises")
    .select("order_index")
    .eq("program_day_id", parsed.programDayId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const nextIndex = (maxRow?.order_index ?? -1) + 1;

  const isTime = parsed.kind === "time";
  const { error } = await supabase.from("program_exercises").insert({
    program_day_id: parsed.programDayId,
    order_index: nextIndex,
    name: parsed.name,
    sets: parsed.sets,
    base_reps: isTime ? null : parsed.baseReps,
    start_weight: isTime ? null : parsed.startWeight,
    increment: isTime ? 0 : parsed.increment,
    tracked: parsed.tracked,
    note: parsed.note,
    image_url: parsed.imageUrl,
    progression_weeks: parsed.progressionWeeks,
    kind: parsed.kind,
    target_seconds: isTime ? parsed.targetSeconds : null,
    custom_exercise_id: parsed.customExerciseId,
    video_path: parsed.videoPath,
    poster_path: parsed.posterPath,
    crop_rect: parsed.cropRect,
    trim_start_seconds: parsed.trimStartSeconds,
    trim_end_seconds: parsed.trimEndSeconds,
    aspect_ratio: parsed.aspectRatio,
    muscles: parsed.muscles,
  });
  if (error) throw error;

  revalidatePath("/program");
  if (parsed.returnTo) {
    revalidatePath("/workout", "layout");
  }

  const dest =
    parsed.returnTo ??
    (parsed.redirectWeek ? `/program?week=${parsed.redirectWeek}` : "/program");
  redirect(dest);
}

const ArchiveExerciseSchema = z.object({
  exerciseId: z.string().uuid(),
});

export async function archiveExerciseFromProgram(
  input: z.infer<typeof ArchiveExerciseSchema>
) {
  const { exerciseId } = ArchiveExerciseSchema.parse(input);
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("program_exercises")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", exerciseId);
  if (error) throw error;

  revalidatePath("/program");
}

export async function unarchiveExerciseFromProgram(
  input: z.infer<typeof ArchiveExerciseSchema>
) {
  const { exerciseId } = ArchiveExerciseSchema.parse(input);
  const { supabase } = await requireUser();

  const { error } = await supabase
    .from("program_exercises")
    .update({ archived_at: null })
    .eq("id", exerciseId);
  if (error) throw error;

  revalidatePath("/program");
}

// Two-phase order_index rewrite: first push every row into a temporary high
// range so the final 0..n-1 assignments can't collide with existing values.
// order_index has no unique constraint today, but this keeps the write safe
// if one is added later. Shared by setExerciseOrder and saveDayEdits.
async function renumberExercises(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderedIds: string[]
) {
  const OFFSET = 1_000_000;
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("program_exercises")
      .update({ order_index: OFFSET + i })
      .eq("id", orderedIds[i]);
    if (error) throw error;
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("program_exercises")
      .update({ order_index: i })
      .eq("id", orderedIds[i]);
    if (error) throw error;
  }
}

// Two-phase day_number rewrite (mirrors renumberExercises): push every row into
// a temp high range so the final 1..N assignments can't collide with the
// `unique (program_id, day_number)` index. planDayOrder also syncs auto "Day N"
// labels to position and parks archived days above the live range. Pass
// `explicitLiveOrder` to impose a new live order (insert/reorder); omit to
// normalize the current order in place. No-ops when already normalized.
async function applyDayOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  explicitLiveOrder?: string[]
) {
  const { data: rows, error } = await supabase
    .from("program_days")
    .select("id, day_number, label, archived_at")
    .eq("program_id", programId);
  if (error) throw error;

  const current = (rows ?? []) as DayRow[];
  const targets = planDayOrder(current, explicitLiveOrder);

  const currentById = new Map(
    current.map((r) => [r.id, { day_number: r.day_number, label: r.label }])
  );
  const changed = targets.some((t) => {
    const c = currentById.get(t.id);
    return !c || c.day_number !== t.day_number || c.label !== t.label;
  });
  if (!changed) return;

  const OFFSET = 1_000_000;
  for (const t of targets) {
    const { error: e1 } = await supabase
      .from("program_days")
      .update({ day_number: OFFSET + t.day_number })
      .eq("id", t.id);
    if (e1) throw e1;
  }
  for (const t of targets) {
    const { error: e2 } = await supabase
      .from("program_days")
      .update({ day_number: t.day_number, label: t.label })
      .eq("id", t.id);
    if (e2) throw e2;
  }
}

const SetExerciseOrderSchema = z.object({
  dayId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function setExerciseOrder(
  input: z.infer<typeof SetExerciseOrderSchema>
) {
  const { dayId, orderedIds } = SetExerciseOrderSchema.parse(input);
  const { supabase } = await requireUser();

  const { data: siblings, error: sErr } = await supabase
    .from("program_exercises")
    .select("id, order_index")
    .eq("program_day_id", dayId)
    .is("archived_at", null)
    .order("order_index", { ascending: true });
  if (sErr) throw sErr;

  // Merge under drift instead of throwing: the workout-page snapshot can
  // diverge from the live program_exercises set if the user adds an exercise
  // mid-workout (via /program/add) or another tab archives one. Keep any IDs
  // from orderedIds that still exist, then append surviving siblings the
  // caller didn't mention (preserving their current order_index relative
  // ordering) so we never lose a row from the persisted order.
  const siblingIds = new Set(siblings.map((s) => s.id));
  const requested = orderedIds.filter((id) => siblingIds.has(id));
  const requestedSet = new Set(requested);
  const appended = siblings
    .map((s) => s.id)
    .filter((id) => !requestedSet.has(id));
  const merged = [...requested, ...appended];
  if (merged.length === 0) {
    throw new Error("No matching exercises to reorder.");
  }

  await renumberExercises(supabase, merged);

  revalidatePath("/program");
}

const SaveDayEditsSchema = z.object({
  dayId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).max(50),
});

// Reconciles a day's exercise list against the user's edit-mode snapshot:
// rows present in the DB but absent from orderedIds are archived; rows in
// orderedIds are renumbered to match the new order.
export async function saveDayEdits(
  input: z.infer<typeof SaveDayEditsSchema>
) {
  const { dayId, orderedIds } = SaveDayEditsSchema.parse(input);
  const { supabase } = await requireUser();

  const { data: siblings, error: sErr } = await supabase
    .from("program_exercises")
    .select("id")
    .eq("program_day_id", dayId)
    .is("archived_at", null);
  if (sErr) throw sErr;

  const orderedSet = new Set(orderedIds);
  const toArchive = (siblings ?? [])
    .map((s) => s.id)
    .filter((id) => !orderedSet.has(id));

  if (toArchive.length > 0) {
    const { error } = await supabase
      .from("program_exercises")
      .update({ archived_at: new Date().toISOString() })
      .in("id", toArchive);
    if (error) throw error;
  }

  await renumberExercises(supabase, orderedIds);

  revalidatePath("/program");
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
      kind: ex.kind ?? "reps",
      target_seconds: ex.target_seconds ?? null,
      peak_taper: ex.peak_taper ?? false,
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

  const { supabase, user } = await requireUser();

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
  redirect("/program");
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
  const { supabase, user } = await requireUser();

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
  redirect("/program");
}

const ProgramIdSchema = z.object({ programId: z.string().uuid() });

export async function setActiveProgram(
  input: z.infer<typeof ProgramIdSchema>
) {
  const { programId } = ProgramIdSchema.parse(input);
  const { supabase, user } = await requireUser();

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
}

export async function archiveProgram(
  input: z.infer<typeof ProgramIdSchema>
) {
  const { programId } = ProgramIdSchema.parse(input);
  const { supabase, user } = await requireUser();

  // Same guard as setActiveProgram: archiving the active program promotes the
  // other one, which would switch the active program out from under an open
  // session. Block it.
  const { data: inProgress, error: ipErr } = await supabase
    .from("workout_sessions")
    .select("id")
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (ipErr) throw ipErr;
  if (inProgress) {
    throw new Error("Finish your in-progress workout before archiving a program.");
  }

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
}

const RenameProgramSchema = z.object({
  programId: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
});

export async function renameProgram(
  input: z.infer<typeof RenameProgramSchema>
) {
  const { programId, name } = RenameProgramSchema.parse(input);
  const { supabase } = await requireUser();

  // RLS scopes the update to the caller's own programs.
  const { error } = await supabase
    .from("programs")
    .update({ name })
    .eq("id", programId);
  if (error) throw error;

  revalidatePath("/program");
}

// ──────────────────────────────────────────────
// Day-level editing
// ──────────────────────────────────────────────

const AddDaySchema = z.object({
  programId: z.string().uuid(),
  label: z.string().min(1).max(40),
  title: z.string().min(1).max(80),
  // 1-indexed insertion slot. If omitted, append after the last day (legacy
  // behavior). If provided, day_numbers >= position shift up by 1.
  position: z.number().int().min(1).max(20).optional(),
});

export async function addDay(input: z.infer<typeof AddDaySchema>) {
  const parsed = AddDaySchema.parse(input);
  const { supabase } = await requireUser();

  // Live days in current order. `position` is a LIVE position (1..N+1), not a
  // raw day_number — so an archived day in the middle can't throw off the slot.
  const { data: live, error: liveErr } = await supabase
    .from("program_days")
    .select("id, day_number")
    .eq("program_id", parsed.programId)
    .is("archived_at", null)
    .order("day_number", { ascending: true });
  if (liveErr) throw liveErr;
  const liveIds = (live ?? []).map((d) => d.id);
  const n = liveIds.length;
  const targetPosition =
    parsed.position !== undefined
      ? Math.min(Math.max(parsed.position, 1), n + 1)
      : n + 1;

  // Park the new row at a temp day_number above everything (incl. archived) so
  // it can't trip the unique index before applyDayOrder renumbers it.
  const { data: maxRow, error: maxErr } = await supabase
    .from("program_days")
    .select("day_number")
    .eq("program_id", parsed.programId)
    .order("day_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw maxErr;
  const tempNumber = (maxRow?.day_number ?? 0) + 1000;

  const { data: inserted, error } = await supabase
    .from("program_days")
    .insert({
      program_id: parsed.programId,
      day_number: tempNumber,
      label: parsed.label,
      title: parsed.title,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Splice the new day into the live order at the requested position, then let
  // applyDayOrder make it contiguous 1..N and sync its "Day N" label.
  const desired = [
    ...liveIds.slice(0, targetPosition - 1),
    inserted.id,
    ...liveIds.slice(targetPosition - 1),
  ];
  await applyDayOrder(supabase, parsed.programId, desired);

  revalidatePath("/program");
  return { dayId: inserted.id };
}

const ReorderDaySchema = z.object({
  dayId: z.string().uuid(),
  direction: z.enum(["up", "down"]),
});

export async function reorderDay(input: z.infer<typeof ReorderDaySchema>) {
  const { dayId, direction } = ReorderDaySchema.parse(input);
  const { supabase } = await requireUser();

  const { data: target, error: tErr } = await supabase
    .from("program_days")
    .select("id, program_id")
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

  const ids = (siblings ?? []).map((d) => d.id);
  const idx = ids.indexOf(dayId);
  const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
  if (idx === -1 || neighborIdx < 0 || neighborIdx >= ids.length) return;

  // Swap the target with its visible neighbor, then renumber + relabel in one
  // place. Replaces the old swap_day_order RPC (which moved day_number but left
  // labels stale).
  [ids[idx], ids[neighborIdx]] = [ids[neighborIdx], ids[idx]];
  await applyDayOrder(supabase, target.program_id, ids);

  revalidatePath("/program");
}
