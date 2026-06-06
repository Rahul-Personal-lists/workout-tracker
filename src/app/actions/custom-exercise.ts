"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { MUSCLE_REGIONS } from "@/lib/muscle-regions";
import { VIDEO_BUCKET } from "@/lib/video-upload";

// Catalog muscle strings (e.g. "chest", "quadriceps") accepted for tagging — the
// same set regionsFromCatalogMuscles understands. Derived so it can't drift.
const MUSCLE_SET = new Set(MUSCLE_REGIONS.flatMap((r) => r.catalogMuscles));

const CropRectSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().gt(0).max(1),
    h: z.number().gt(0).max(1),
  })
  .nullable();

const CreateSchema = z
  .object({
    customExerciseId: z.string().uuid(),
    name: z.string().min(1).max(120),
    videoPath: z.string().min(1).max(500),
    posterPath: z.string().min(1).max(500),
    cropRect: CropRectSchema,
    trimStartSeconds: z.number().min(0).max(36000).nullable(),
    trimEndSeconds: z.number().gt(0).max(36000).nullable(),
    aspectRatio: z.number().gt(0).max(10).nullable(),
    muscles: z
      .array(z.string())
      .max(17)
      .refine((a) => a.every((m) => MUSCLE_SET.has(m)), "Unknown muscle"),
  })
  .refine(
    (v) =>
      v.trimStartSeconds == null ||
      v.trimEndSeconds == null ||
      v.trimEndSeconds > v.trimStartSeconds,
    { message: "Trim end must be after start" }
  );

export async function createCustomExercise(input: z.infer<typeof CreateSchema>) {
  const v = CreateSchema.parse(input);
  const { supabase, user } = await requireUser();

  // Both objects must sit under the caller's own folder (defense-in-depth on top
  // of storage RLS) — the folder id == the row id so delete/GC is deterministic.
  const prefix = `${user.id}/exercise-videos/${v.customExerciseId}/`;
  if (!v.videoPath.startsWith(prefix) || !v.posterPath.startsWith(prefix)) {
    throw new Error("Invalid video path");
  }

  const { error } = await supabase.from("custom_exercises").insert({
    id: v.customExerciseId,
    user_id: user.id,
    name: v.name,
    video_path: v.videoPath,
    poster_path: v.posterPath,
    crop_rect: v.cropRect,
    trim_start_seconds: v.trimStartSeconds,
    trim_end_seconds: v.trimEndSeconds,
    aspect_ratio: v.aspectRatio,
    muscles: v.muscles,
  });
  // Roll back the uploaded objects if the row insert fails (mirror recordBodyPhotos).
  if (error) {
    await supabase.storage.from(VIDEO_BUCKET).remove([v.videoPath, v.posterPath]);
    throw error;
  }

  revalidatePath("/program/exercises");
  return { id: v.customExerciseId };
}

const DeleteSchema = z.object({ id: z.string().uuid() });

export async function deleteCustomExercise(input: z.infer<typeof DeleteSchema>) {
  const { id } = DeleteSchema.parse(input);
  const { supabase, user } = await requireUser();

  // Soft delete only: the storage object is shared with any program_exercises
  // rows that snapshotted this video, so past sessions keep playing. (GC of
  // never-referenced uploads is deferred.)
  const { error } = await supabase
    .from("custom_exercises")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/program/exercises");
}

const SignSchema = z.object({ path: z.string().min(1).max(500) });

// Re-sign a single video path when a signed URL 403s mid-session (the player
// calls this from its <video> onError handler).
export async function signCustomVideoUrl(
  input: z.infer<typeof SignSchema>
): Promise<string | null> {
  const { path } = SignSchema.parse(input);
  const { supabase, user } = await requireUser();
  if (!path.startsWith(`${user.id}/`)) throw new Error("Invalid path");
  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(path, 60 * 60 * 6);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
